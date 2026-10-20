import { FormGelombang } from "@/features/admin/gelombang/form-gelombang";
import { ambilGelombangAdmin } from "@/server/actions/gelombang";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Gelombang" };

export default async function HalamanGelombang() {
  await wajibPeranHalaman(...PERAN.pendaftar);
  const { periode, baris, totalKuota, totalTerisi } = await ambilGelombangAdmin();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold text-ink">Gelombang pendaftaran</h1>
      <p className="mt-1 max-w-[62ch] text-tinta-redup">
        Jadwal dan kuota tiap gelombang untuk tahun ajaran <span className="angka font-semibold text-tinta">{periode}</span>. Pendaftaran terbuka hanya selama
        gelombang aktif berjalan dan kuotanya belum penuh. Pendaftar yang ditolak tidak dihitung. Tanggal gelombang aktif tidak boleh tumpang tindih. Bila belum ada gelombang,
        pendaftaran mengikuti tanggal buka dan tutup di Pengaturan.
      </p>
      <p className="mt-3 text-sm font-semibold text-tinta">
        Terdaftar <span className="angka">{totalTerisi}</span>
        {totalKuota !== null ? (
          <>
            {" "}
            dari total kuota <span className="angka">{totalKuota}</span> gelombang aktif
          </>
        ) : null}
        .
      </p>
      <div className="mt-6">
        <FormGelombang awal={baris} />
      </div>
    </div>
  );
}
