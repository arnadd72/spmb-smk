import { PanelAsetSitus } from "@/features/admin/konten/panel-aset-situs";
import { PanelKonten } from "@/features/admin/konten/panel-konten";
import { KONFIG_KONTEN } from "@/features/admin/konten/konfig";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";
import { bawaanSudahDimuat, daftarAset } from "@/server/services/asetSitus";

export const metadata = { title: "Galeri" };

export default async function Halaman() {
  await wajibPeranHalaman(...PERAN.konten);
  const [data, bawaanDimuat] = await Promise.all([daftarAset(), bawaanSudahDimuat()]);
  return <PanelKonten konfig={KONFIG_KONTEN.galeri} ekstra={<PanelAsetSitus awal={{ data, bawaanDimuat }} />} />;
}
