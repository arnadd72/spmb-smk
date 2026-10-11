import { PanelJurusan } from "@/features/admin/konten/panel-jurusan";
import { EditorBobot } from "@/features/admin/referensi/editor-bobot";
import { ambilEditorBobot } from "@/server/actions/referensi";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Jurusan dan bobot" };

export default async function Halaman() {
  await wajibPeranHalaman(...PERAN.sistem);
  const { mapel, jurusan } = await ambilEditorBobot();
  return (
    <>
      <PanelJurusan />
      <div className="mx-auto max-w-5xl pb-10">
        <EditorBobot mapel={mapel} jurusan={jurusan} />
      </div>
    </>
  );
}
