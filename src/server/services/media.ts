import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { createClient } from "@supabase/supabase-js";
import { kompresGambar } from "@/server/services/kompresi";
import { buatTokenAcak } from "@/server/services/kripto";
import { MAKS_UKURAN_BYTE, deteksiMime } from "@/server/services/draf";
import { DriverDrive } from "@/server/services/penyimpanan/driverDrive";
import { idFolderRoot, klienDrive, statusDrive } from "@/server/services/penyimpanan/driveOAuth";
import { GalatApi } from "@/server/types/galat";
import { AWALAN_MEDIA, KATEGORI_MEDIA, type KategoriMedia } from "@/server/types/media";

// Gambar konten publik (berita, galeri, testimoni, foto jurusan, aset situs). Penyimpanan utama Google Drive (poin B):
// dikompres, disimpan di SPMB/situs/{kategori}/ dengan tanda publik, dan dikirim lewat /api/v1/media/{fileId}. Tanpa Drive
// dan bukan produksi, gambar disimpan di public/uploads/konten supaya bisa dikembangkan lokal; folder itu tidak di-commit.
// Gambar lama di bucket Supabase `konten-publik` tetap bisa dihapus.

const AWALAN_LOKAL = "/uploads/konten/";
const GAMBAR_SAH = new Set(["image/jpeg", "image/png", "image/webp"]);
const POLA_ID_DRIVE = /^[A-Za-z0-9_-]{10,200}$/;

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !kunci) return null;
  return { klien: createClient(url, kunci, { auth: { persistSession: false } }), url, bucket: process.env.SUPABASE_BUCKET_PUBLIC ?? "konten-publik" };
}

const awalanSupabase = (s: NonNullable<ReturnType<typeof supabase>>) => `${s.url}/storage/v1/object/public/${s.bucket}/`;

/** Driver Drive bila sudah dihubungkan; null bila belum. */
async function driveTerhubung(): Promise<DriverDrive | null> {
  if (!(await statusDrive().catch(() => ({ terhubung: false }))).terhubung) return null;
  const drive = await klienDrive();
  return new DriverDrive(drive, await idFolderRoot(drive));
}

/** Kategori folder dari isian form; selain daftar KATEGORI_MEDIA ditolak. */
export function bacaKategoriMedia(nilai: unknown): KategoriMedia {
  if (typeof nilai === "string" && (KATEGORI_MEDIA as readonly string[]).includes(nilai)) return nilai as KategoriMedia;
  throw GalatApi.validasi({ kategori: ["Kategori gambar tidak dikenal."] });
}

/** Simpan gambar dan kembalikan alamatnya. Isi diperiksa dari byte (JPG, PNG, WebP; maks 5 MB). */
export async function simpanMedia(isi: Buffer, kategori: KategoriMedia): Promise<string> {
  if (isi.length === 0) throw GalatApi.validasi({ berkas: ["Berkas kosong."] });
  if (isi.length > MAKS_UKURAN_BYTE) throw GalatApi.validasi({ berkas: ["Ukuran gambar melebihi 5 MB."] });
  const jenis = deteksiMime(isi);
  if (!jenis || !GAMBAR_SAH.has(jenis.mime)) throw GalatApi.validasi({ berkas: ["Format gambar harus JPG, PNG, atau WebP."] });

  const hemat = await kompresGambar(isi, jenis.mime, kategori === "logo" ? "logo" : "web");
  const sekarang = new Date();
  const bulan = `${sekarang.getUTCFullYear()}-${String(sekarang.getUTCMonth() + 1).padStart(2, "0")}`;

  const drive = await driveTerhubung();
  if (drive) {
    const id = await drive.simpan(`situs/${kategori}/${bulan}-${buatTokenAcak(14)}.${hemat.ext}`, hemat.isi, hemat.mime, { publik: true });
    return `${AWALAN_MEDIA}${id}`;
  }

  if (process.env.NODE_ENV === "production") {
    throw new GalatApi(503, "STORAGE_UNAVAILABLE", "Google Drive belum terhubung. Hubungkan dari menu Pengaturan.");
  }
  const relatif = `${bulan.replace("-", "/")}/${buatTokenAcak(14)}.${hemat.ext}`;
  const lokasi = path.join(process.cwd(), "public", AWALAN_LOKAL, relatif);
  await mkdir(path.dirname(lokasi), { recursive: true });
  await writeFile(lokasi, hemat.isi, { flag: "wx" });
  return `${AWALAN_LOKAL}${relatif}`;
}

/**
 * Buka foto web dari Drive untuk route media. Null (route menjawab 404) bila ID tidak sah, Drive belum terhubung, berkas tidak
 * ada atau terhapus, tidak bertanda publik, atau bukan gambar. Dokumen pendaftar tidak pernah bertanda publik.
 */
export async function bukaMediaPublik(id: string): Promise<{ aliran: Readable; mime: string } | null> {
  if (!POLA_ID_DRIVE.test(id)) return null;
  const drive = await driveTerhubung();
  const meta = drive ? await drive.metadataPublik(id) : null;
  if (!drive || !meta || !GAMBAR_SAH.has(meta.mime)) return null;
  return { aliran: await drive.ambilStream(id), mime: meta.mime };
}

/** Hapus gambar hanya bila dikelola sistem ini (hasil unggah); alamat luar dibiarkan. Tidak pernah melempar. */
export async function hapusMediaBila(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (url.startsWith(AWALAN_MEDIA)) {
      const id = url.slice(AWALAN_MEDIA.length);
      const drive = POLA_ID_DRIVE.test(id) ? await driveTerhubung() : null;
      // Hanya berkas bertanda publik: URL yang disunting ke ID dokumen pendaftar tidak boleh menghapus dokumen itu.
      if (drive && (await drive.metadataPublik(id))) await drive.hapus(id);
      return;
    }
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
