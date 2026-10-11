import { FormInputManual } from "@/features/admin/peserta/form-input-manual";
import { fieldEdit } from "@/server/actions/peserta";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";
import { ambilKonfigWizard, muatDefinisiField } from "@/server/services/draf";
import { mapelBerbobot, muatBobotJurusan } from "@/server/services/rekomendasi";

export const metadata = { title: "Input manual" };

export default async function HalamanInputManual() {
  await wajibPeranHalaman(...PERAN.pendaftar);
  const [fields, konfig, bobot] = await Promise.all([muatDefinisiField(), ambilKonfigWizard(), muatBobotJurusan()]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold text-ink">Input manual pendaftar luring</h1>
      <p className="mt-1 max-w-[62ch] text-tinta-redup">
        Untuk calon murid yang mendaftar langsung ke sekolah. Nomor pendaftaran dibuat otomatis dengan urutan yang sama seperti pendaftaran daring, dan nilai rapor
        (bila diisi) dipakai untuk saran jurusan.
      </p>
      <div className="mt-6">
        <FormInputManual fields={fieldEdit(fields)} mapel={mapelBerbobot(bobot).map((m) => ({ kode: m.kode, nama: m.nama }))} semester={konfig.semester} />
      </div>
    </div>
  );
}
