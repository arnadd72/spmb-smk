import { PanelSoalMinat } from "@/features/admin/tes-minat/panel-soal-minat";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Tes Minat Bakat" };

export default async function Halaman() {
  await wajibPeranHalaman(...PERAN.konten);
  return <PanelSoalMinat />;
}
