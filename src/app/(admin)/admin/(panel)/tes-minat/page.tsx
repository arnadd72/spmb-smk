import { PanelKonten } from "@/features/admin/konten/panel-konten";
import { KONFIG_KONTEN } from "@/features/admin/konten/konfig";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Soal Tes Minat Bakat" };

export default async function Halaman() {
  await wajibPeranHalaman(...PERAN.konten);
  return <PanelKonten konfig={KONFIG_KONTEN.soalMinat} />;
}
