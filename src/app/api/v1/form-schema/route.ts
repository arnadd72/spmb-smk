import { ambilKonfigWizard, muatDefinisiField } from "@/server/services/draf";
import { NAMA_LANGKAH } from "@/server/validasi/wizard";
import { jsonPublik } from "../../_lib/publik";
import { tangani } from "../../_lib/tangani";

/** Isian formulir pendaftaran yang tampil per langkah (form builder) dan jadwal, untuk klien lain atau pratinjau. */
export const GET = tangani(async () => {
  const [fields, konfig] = await Promise.all([muatDefinisiField(), ambilKonfigWizard()]);
  return jsonPublik(
    {
      tahunAjaran: konfig.tahunAjaran,
      status: konfig.status,
      buka: konfig.buka,
      tutup: konfig.tutup,
      langkah: NAMA_LANGKAH.map((nama, i) => ({
        nomor: i + 1,
        nama,
        field: fields
          .filter((f) => f.langkah === i + 1)
          .map((f) => ({ kunci: f.kunci, label: f.label, tipe: f.tipe, wajib: f.wajib, teksBantuan: f.teksBantuan ?? null, opsi: f.opsi ?? null })),
      })),
    },
    { detik: 30 },
  );
});
