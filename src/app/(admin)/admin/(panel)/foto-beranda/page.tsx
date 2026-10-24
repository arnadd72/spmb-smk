import { PanelAsetSitus } from "@/features/admin/konten/panel-aset-situs";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";
import { bawaanSudahDimuat, daftarAset } from "@/server/services/asetSitus";

export const metadata = { title: "Foto Beranda" };

// Foto tetap situs (logo, foto utama beranda, foto jurusan), terpisah dari galeri kegiatan. Foto tambahan slideshow beranda ada di dalam kartu Foto utama beranda.
export default async function Halaman() {
  await wajibPeranHalaman(...PERAN.konten);
  const [data, bawaanDimuat] = await Promise.all([daftarAset(), bawaanSudahDimuat()]);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold text-ink">Foto Beranda</h1>
      <p className="mt-1 max-w-prose text-sm text-tinta-redup">
        Logo, foto utama di bagian atas beranda beserta foto tambahannya, dan foto tiap jurusan. Foto kegiatan sekolah diatur di menu Galeri.
      </p>
      <PanelAsetSitus awal={{ data, bawaanDimuat }} />
    </div>
  );
}
