import { FormKuota } from "@/features/admin/kuota/form-kuota";
import { ambilKuota } from "@/server/actions/kuota";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Kuota" };

export default async function HalamanKuota() {
  await wajibPeranHalaman(...PERAN.pendaftar);
  const { periode, baris } = await ambilKuota();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold text-ink">Kuota</h1>
      <p className="mt-1 max-w-[60ch] text-tinta-redup">
        Daya tampung tiap jurusan untuk tahun ajaran <span className="angka font-semibold text-tinta">{periode}</span>. Terdaftar menghitung pilihan 1 semua pendaftar kecuali yang ditolak.
        Kuota tidak memblokir pendaftaran; pendaftar diberi tahu bila kuota penuh, keputusan akhir ada di panitia.
      </p>
      <div className="mt-6">
        <FormKuota awal={baris} />
      </div>
    </div>
  );
}
