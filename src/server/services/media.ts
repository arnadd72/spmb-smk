import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buatTokenAcak } from "@/server/services/kripto";
import { MAKS_UKURAN_BYTE, deteksiMime } from "@/server/services/draf";
import { GalatApi } from "@/server/types/galat";

// Gambar konten publik (berita, galeri, testimoni, foto jurusan) untuk situs (PRD v4 7.4: bucket publik `konten-publik`).
// Tanpa Supabase dan bukan produksi, gambar disimpan di public/uploads/konten supaya bisa dikembangkan lokal;
// folder itu tidak di-commit. Di produksi tanpa Supabase unggah ditolak, karena disk Vercel tidak persisten.

const AWALAN_LOKAL = "/uploads/konten/";
const GAMBAR_SAH = new Set(["image/jpeg", "image/png", "image/webp"]);

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !kunci) return null;
  return { klien: createClient(url, kunci, { auth: { persistSession: false } }), url, bucket: process.env.SUPABASE_BUCKET_PUBLIC ?? "konten-publik" };
}

const awalanSupabase = (s: NonNullable<ReturnType<typeof supabase>>) => `${s.url}/storage/v1/object/public/${s.bucket}/`;

/** Simpan gambar dan kembalikan URL publiknya. Isi diperiksa dari byte (JPG, PNG, WebP; maks 5 MB). */
export async function simpanMedia(isi: Buffer): Promise<string> {
  if (isi.length === 0) throw GalatApi.validasi({ berkas: ["Berkas kosong."] });
  if (isi.length > MAKS_UKURAN_BYTE) throw GalatApi.validasi({ berkas: ["Ukuran gambar melebihi 5 MB."] });
  const jenis = deteksiMime(isi);
  if (!jenis || !GAMBAR_SAH.has(jenis.mime)) throw GalatApi.validasi({ berkas: ["Format gambar harus JPG, PNG, atau WebP."] });

  const sekarang = new Date();
  const relatif = `${sekarang.getUTCFullYear()}/${String(sekarang.getUTCMonth() + 1).padStart(2, "0")}/${buatTokenAcak(14)}.${jenis.ext}`;

  const s = supabase();
  if (s) {
    const { error } = await s.klien.storage.from(s.bucket).upload(`konten/${relatif}`, isi, { contentType: jenis.mime, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(`Gagal mengunggah gambar: ${error.message}`);
    return s.klien.storage.from(s.bucket).getPublicUrl(`konten/${relatif}`).data.publicUrl;
  }

  if (process.env.NODE_ENV === "production") {
    throw new GalatApi(503, "STORAGE_UNAVAILABLE", "Penyimpanan gambar belum dikonfigurasi (Supabase Storage).");
  }
  const lokasi = path.join(process.cwd(), "public", AWALAN_LOKAL, relatif);
  await mkdir(path.dirname(lokasi), { recursive: true });
  await writeFile(lokasi, isi, { flag: "wx" });
  return `${AWALAN_LOKAL}${relatif}`;
}

/** Hapus gambar hanya bila dikelola sistem ini (hasil unggah); alamat luar dibiarkan. Tidak pernah melempar. */
export async function hapusMediaBila(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (url.startsWith(AWALAN_LOKAL)) {
      const relatif = url.slice(AWALAN_LOKAL.length);
      if (relatif.includes("..")) return;
      await rm(path.join(process.cwd(), "public", AWALAN_LOKAL, relatif), { force: true });
      return;
    }
    const s = supabase();
    if (s && url.startsWith(awalanSupabase(s))) {
      await s.klien.storage.from(s.bucket).remove([url.slice(awalanSupabase(s).length)]);
    }
  } catch {
    // Gambar yatim tidak merusak apa pun; abaikan.
  }
}
