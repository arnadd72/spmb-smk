import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";
import { formatTanggal } from "@/lib/format";
import { antreanVerifikasi } from "@/server/actions/verifikasi";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Verifikasi" };

export default async function HalamanVerifikasi() {
  await wajibPeranHalaman(...PERAN.pendaftar);
  const { total, daftar } = await antreanVerifikasi(50);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold text-ink">Verifikasi</h1>
      <p className="mt-1 text-tinta-redup">
        <span className="angka font-semibold text-tinta">{total}</span> pendaftar menunggu verifikasi, paling lama dikirim di urutan teratas.
      </p>

      {daftar.length === 0 ? (
        <div className="mt-6">
          <EmptyState judul="Antrean kosong" deskripsi="Semua pendaftar sudah diverifikasi. Pendaftar baru akan muncul di sini." />
        </div>
      ) : (
        <>
          <Link
            href={`/admin/verifikasi/${daftar[0].id}`}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-kontrol bg-primer px-5 text-sm font-semibold text-primer-tinta hover:bg-primer-tua"
          >
            Mulai dari yang paling lama
            <ArrowRightIcon aria-hidden className="size-4" />
          </Link>
          <div className="relative mt-5 overflow-x-auto rounded-kartu border border-garis bg-permukaan">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Antrean verifikasi</caption>
              <thead className="border-b border-garis bg-permukaan-alt text-tinta-redup">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Nomor</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Nama</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Asal sekolah</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Jurusan</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Dikirim</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((p) => (
                  <tr key={p.id} className="border-b border-garis last:border-0 hover:bg-permukaan-alt/60">
                    <td className="angka px-4 py-2.5 font-semibold">
                      <Link href={`/admin/verifikasi/${p.id}`} className="text-primer-tua underline underline-offset-4">
                        {p.nomor}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{p.nama}</td>
                    <td className="px-4 py-2.5">{p.asalSekolah ?? "-"}</td>
                    <td className="px-4 py-2.5">{p.jurusan ?? "-"}</td>
                    <td className="angka px-4 py-2.5 text-tinta-redup">{formatTanggal(p.dikirim)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > daftar.length && <p className="mt-3 text-sm text-tinta-redup">Menampilkan {daftar.length} teratas dari {total}.</p>}
        </>
      )}
    </div>
  );
}
