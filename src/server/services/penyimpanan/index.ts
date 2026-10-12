import { createClient } from "@supabase/supabase-js";
import { DriverDrive } from "./driverDrive";
import { idFolderRoot, klienDrive } from "./driveOAuth";
import path from "node:path";
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
 * Penyimpanan berkas sementara wizard: bucket privat draf-temp di Supabase. Bila Supabase belum diisi dan
 * bukan produksi, pakai disk lokal (.local/draf-temp) agar alur unggah bisa dikembangkan tanpa Supabase.
 */
export function penyimpananTemp(): PenyimpananDokumen {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !kunci) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum diisi.");
    }
    // `||`, bukan `??`: DRAF_TEMP_DIR kosong di .env (bawaan .env.example) harus jatuh ke folder bawaan, bukan root proyek.
    return new DriverLokal(process.env.DRAF_TEMP_DIR || path.join(process.cwd(), ".local", "draf-temp"));
  }

  const supabase = createClient(url, kunci, { auth: { persistSession: false } });
  return new DriverSupabaseTemp(supabase, process.env.SUPABASE_BUCKET_DRAFT ?? "draf-temp");
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
