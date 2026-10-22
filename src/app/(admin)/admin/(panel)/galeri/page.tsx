import { MuatGaleriBawaan } from "@/features/admin/konten/muat-galeri-bawaan";
import { PanelKonten } from "@/features/admin/konten/panel-konten";
import { KONFIG_KONTEN } from "@/features/admin/konten/konfig";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";
import { bawaanSudahDimuat } from "@/server/services/asetSitus";

export const metadata = { title: "Galeri" };

// Galeri kegiatan (bagian "Kehidupan sekolah" di beranda). Logo, foto utama, dan foto jurusan ada di halaman Foto Beranda.
export default async function Halaman() {
  await wajibPeranHalaman(...PERAN.konten);
  return <PanelKonten konfig={KONFIG_KONTEN.galeri} ekstra={<MuatGaleriBawaan bawaanDimuat={await bawaanSudahDimuat()} />} />;
}
