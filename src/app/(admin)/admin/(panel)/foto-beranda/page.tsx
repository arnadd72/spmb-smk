import { PanelAsetSitus } from "@/features/admin/konten/panel-aset-situs";
import { PanelKonten } from "@/features/admin/konten/panel-konten";
import { KONFIG_KONTEN } from "@/features/admin/konten/konfig";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";
import { bawaanSudahDimuat, daftarAset } from "@/server/services/asetSitus";

export const metadata = { title: "Foto Beranda" };

// Foto tetap situs (logo, foto utama beranda, foto jurusan) dan foto tambahan slideshow beranda, terpisah dari galeri kegiatan.
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
      <PanelKonten
        konfig={KONFIG_KONTEN.hero}
        bagian
        keterangan="Foto utama beranda selalu tampil pertama. Foto di sini menyusul dan berganti otomatis tiap 5 detik. Maksimal 6 foto. Tambah lewat tombol Tambah foto di kartu Foto utama beranda."
      />
    </div>
  );
}
