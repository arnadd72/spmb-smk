import { createClient } from "@supabase/supabase-js";
import { DriverDrive } from "./driverDrive";
import { idFolderRoot, klienDrive } from "./driveOAuth";
import path from "node:path";
import { konfigCloudinary } from "@/server/services/cloudinary";
import { DriverCloudinary, adalahRefCloudinary } from "./driverCloudinary";
import { DriverLokal } from "./driverLokal";
import { DriverSupabaseTemp } from "./driverSupabaseTemp";
import type { PenyimpananDokumen } from "./antarmuka";

export type { PenyimpananDokumen } from "./antarmuka";

/** Penyimpanan dokumen pendaftar (Google Drive). Melempar bila Drive belum dihubungkan. */
export async function penyimpananDokumen(): Promise<PenyimpananDokumen> {
  const drive = await klienDrive();
  return new DriverDrive(drive, await idFolderRoot(drive));
}

/**
 * Penyimpanan berkas sementara lama: bucket privat draf-temp di Supabase. Bila Supabase belum diisi dan
 * bukan produksi, pakai disk lokal (.local/draf-temp) agar alur unggah bisa dikembangkan tanpa Supabase.
 * Di produksi tanpa Supabase mengembalikan null bila Cloudinary terpasang (pas foto tidak butuh Supabase), selain itu melempar.
 */
function penyimpananSementaraLama(): PenyimpananDokumen | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !kunci) {
    if (process.env.NODE_ENV === "production") {
      if (konfigCloudinary()) return null;
      throw new Error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum diisi.");
    }
    // `||`, bukan `??`: DRAF_TEMP_DIR kosong di .env (bawaan .env.example) harus jatuh ke folder bawaan, bukan root proyek.
    return new DriverLokal(process.env.DRAF_TEMP_DIR || path.join(process.cwd(), ".local", "draf-temp"));
  }

  const supabase = createClient(url, kunci, { auth: { persistSession: false } });
  return new DriverSupabaseTemp(supabase, process.env.SUPABASE_BUCKET_DRAFT ?? "draf-temp");
}

const POLA_PAS_FOTO = /(^|\/)pas_foto-[^/]*$/;

/**
 * Pas foto baru masuk Cloudinary (rujukan berawalan "cld:"); berkas lain dan rujukan lama tetap di penyimpanan sementara lama.
 * Membaca dan menghapus dipilih dari rujukannya, jadi pas foto lama di Supabase tetap bisa dibuka sampai dimigrasi.
 */
class PenyimpananGabungan implements PenyimpananDokumen {
  constructor(
    private readonly lama: PenyimpananDokumen | null,
    private readonly cld: DriverCloudinary,
  ) {}

  private lamaAtauGalat(): PenyimpananDokumen {
    if (!this.lama) throw new Error("Penyimpanan berkas sementara belum dikonfigurasi (Supabase Storage).");
    return this.lama;
  }

  private untukRef(ref: string): PenyimpananDokumen {
    return adalahRefCloudinary(ref) ? this.cld : this.lamaAtauGalat();
  }

  simpan(path: string, isi: Buffer, mime?: string) {
    return POLA_PAS_FOTO.test(path) ? this.cld.simpan(path, isi, mime) : this.lamaAtauGalat().simpan(path, isi, mime);
  }
  ambilStream(ref: string) {
    return this.untukRef(ref).ambilStream(ref);
  }
  hapus(ref: string) {
    return this.untukRef(ref).hapus(ref);
  }
  ada(ref: string) {
    return this.untukRef(ref).ada(ref);
  }
}

/**
 * Penyimpanan berkas sementara wizard dan pas foto. Dengan Cloudinary terpasang, pas foto disimpan di sana (terautentikasi);
 * tanpa Cloudinary perilakunya sama seperti sebelumnya.
 */
export function penyimpananTemp(): PenyimpananDokumen {
  const c = konfigCloudinary();
  const lama = penyimpananSementaraLama();
  if (!c) {
    if (!lama) throw new Error("Penyimpanan berkas sementara belum dikonfigurasi.");
    return lama;
  }
  return new PenyimpananGabungan(lama, new DriverCloudinary(c));
}

/** Uji tulis-baca-hapus berkas kecil; dipakai tombol "Uji koneksi" dan pemeriksaan kesehatan. */
export async function ujiPenyimpanan(penyimpanan: PenyimpananDokumen, awalan = "_uji"): Promise<void> {
  const isi = `uji-spmb-${Date.now()}`;
  const ref = await penyimpanan.simpan(`${awalan}/uji-${Date.now()}.txt`, Buffer.from(isi), "text/plain");

  const potongan: Buffer[] = [];
  for await (const p of await penyimpanan.ambilStream(ref)) potongan.push(Buffer.from(p));
  if (Buffer.concat(potongan).toString() !== isi) throw new Error("Uji gagal: isi berkas tidak sama dengan yang ditulis.");

  await penyimpanan.hapus(ref);
  if (await penyimpanan.ada(ref)) throw new Error("Uji gagal: berkas masih ada setelah dihapus.");
}
