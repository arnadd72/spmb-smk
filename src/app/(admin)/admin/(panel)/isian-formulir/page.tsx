import { PanelFormBuilder } from "@/features/admin/referensi/panel-form-builder";
import { daftarFieldAdmin } from "@/server/actions/formBuilder";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Isian formulir" };

export default async function HalamanIsianFormulir() {
  await wajibPeranHalaman(...PERAN.sistem);
  const fields = await daftarFieldAdmin();
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold text-ink">Isian formulir</h1>
      <p className="mt-1 max-w-[66ch] text-tinta-redup">
        Atur isian yang tampil dan wajib di wizard pendaftaran, dan tambah isian kustom. Perubahan langsung berlaku untuk pendaftar berikutnya. Isian inti (nama, NISN,
        tanggal lahir, jurusan) terkunci. Formulir PDF tetap mengikuti template resmi, sehingga isian kustom tidak ikut tercetak di sana.
      </p>
      <div className="mt-6">
        <PanelFormBuilder fields={fields} />
      </div>
    </div>
  );
}
