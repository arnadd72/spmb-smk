import { PanelMapel } from "@/features/admin/referensi/panel-mapel";
import { daftarMapelAdmin } from "@/server/actions/referensi";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Mata pelajaran" };

export default async function HalamanMapel() {
  await wajibPeranHalaman(...PERAN.sistem);
  const mapel = await daftarMapelAdmin();
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold text-ink">Mata pelajaran</h1>
      <p className="mt-1 max-w-[64ch] text-tinta-redup">
        Mata pelajaran yang muncul di tabel nilai rapor dan saran jurusan. Alias dipakai OCR untuk mengenali nama mata pelajaran di rapor.
      </p>
      <div className="mt-6">
        <PanelMapel mapel={mapel} />
      </div>
    </div>
  );
}
