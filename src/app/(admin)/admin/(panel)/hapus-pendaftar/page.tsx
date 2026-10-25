import { HalamanHapus } from "@/features/admin/hapus/halaman-hapus";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";
import { prisma } from "@/server/db/client";
import { ambilKonfigWizard } from "@/server/services/draf";

export const metadata = { title: "Hapus pendaftar" };

export default async function HalamanHapusPendaftar() {
  await wajibPeranHalaman(...PERAN.sistem);
  const [{ tahunAjaran }, ada] = await Promise.all([
    ambilKonfigWizard(),
    prisma.pendaftar.findMany({ distinct: ["periode"], select: { periode: true }, orderBy: { periode: "desc" } }),
  ]);
  const periode = [...new Set([tahunAjaran, ...ada.map((p) => p.periode)])];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold text-ink">Hapus pendaftar</h1>
      <p className="mt-1 max-w-[62ch] text-tinta-redup">
        Menghapus data pendaftar secara permanen, termasuk berkas di Google Drive. Gunakan untuk membersihkan data uji coba atau pendaftar yang keliru.
        Tidak bisa dibatalkan.
      </p>
      <div className="mt-6">
        <HalamanHapus periodeBawaan={tahunAjaran} periode={periode} />
      </div>
    </div>
  );
}
