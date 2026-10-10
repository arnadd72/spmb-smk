import { createClient } from "@supabase/supabase-js";
import { DriverDrive } from "./driverDrive";
import { idFolderRoot, klienDrive } from "./driveOAuth";
import { DriverSupabaseTemp } from "./driverSupabaseTemp";
import type { PenyimpananDokumen } from "./antarmuka";

export type { PenyimpananDokumen } from "./antarmuka";

/** Penyimpanan dokumen pendaftar (Google Drive). Melempar bila Drive belum dihubungkan. */
export async function penyimpananDokumen(): Promise<PenyimpananDokumen> {
  const drive = await klienDrive();
  return new DriverDrive(drive, await idFolderRoot(drive));
}

/** Penyimpanan berkas sementara wizard (bucket privat draf-temp di Supabase). */
export function penyimpananTemp(): PenyimpananDokumen {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !kunci) throw new Error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum diisi.");

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
