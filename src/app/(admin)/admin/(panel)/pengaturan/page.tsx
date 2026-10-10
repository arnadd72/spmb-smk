import { PanelPengaturan } from "@/features/admin/pengaturan/panel-pengaturan";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Pengaturan" };

export default async function Halaman() {
  await wajibPeranHalaman(...PERAN.sistem);
  return <PanelPengaturan />;
}
