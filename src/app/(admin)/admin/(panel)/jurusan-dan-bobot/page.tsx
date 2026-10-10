import { PanelJurusan } from "@/features/admin/konten/panel-jurusan";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Jurusan dan bobot" };

export default async function Halaman() {
  await wajibPeranHalaman(...PERAN.sistem);
  return <PanelJurusan />;
}
