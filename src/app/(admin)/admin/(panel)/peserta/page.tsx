import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPesertaForm } from "@/features/admin/peserta/filter-form";
import { queryFilter } from "@/features/admin/peserta/query";
import { TombolSinkronSemua } from "@/features/admin/verifikasi/tombol-sinkron";
import { cn } from "@/lib/cn";
import { formatTanggal } from "@/lib/format";
import { bacaFilter, daftarPeserta, type FilterPeserta } from "@/server/actions/peserta";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";
import { prisma } from "@/server/db/client";
import { ambilKonfigWizard } from "@/server/services/draf";

export const metadata = { title: "Data peserta" };

const KOLOM: { urut: NonNullable<FilterPeserta["urut"]>; label: string }[] = [
  { urut: "nomor", label: "Nomor" },
  { urut: "nama", label: "Nama" },
  { urut: "dikirim", label: "Dikirim" },
];

export default async function HalamanPeserta({ searchParams }: PageProps<"/admin/peserta">) {
  await wajibPeranHalaman(...PERAN.pendaftar);
  const filter = bacaFilter(await searchParams);
  const [{ tahunAjaran }, jurusan] = await Promise.all([
    ambilKonfigWizard(),
    prisma.jurusan.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" }, select: { kode: true } }),
  ]);
  const hasil = await daftarPeserta(filter, tahunAjaran);
  const urutAktif = filter.urut ?? "dikirim";
  const arahAktif = filter.arah ?? "desc";

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-3xl font-bold text-ink">Data peserta</h1>
      <p className="mt-1 text-tinta-redup">
        <span className="angka font-semibold text-tinta">{hasil.total}</span> pendaftar
        {filter.periode === "semua" ? " dari semua periode" : ` periode ${filter.periode ?? tahunAjaran}`}
      </p>

      <FilterPesertaForm filter={filter} jurusan={jurusan.map((j) => j.kode)} periodeAktif={tahunAjaran} />

      {filter.ganda ? (
        <p role="status" className="mt-3 text-sm text-tinta">
          Menampilkan pendaftar kemungkinan ganda: nama dan tanggal lahir sama, belum ditandai bukan pendaftar ganda.{" "}
          <Link href="/admin/peserta" className="font-semibold text-primer-tua underline underline-offset-4">
            Tampilkan semua
          </Link>
        </p>
      ) : (
        <p className="mt-3">
          <Link href={`/admin/ekspor${queryFilter(filter, { halaman: undefined })}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primer-tua underline underline-offset-4">
            Ekspor hasil filter ini (XLSX atau rekap PDF)
          </Link>
        </p>
      )}

      {(filter.sinkron === "menunggu" || filter.sinkron === "gagal") && (
        <div className="mt-4">
          <TombolSinkronSemua />
        </div>
      )}

      {hasil.baris.length === 0 ? (
        <div className="mt-6">
          <EmptyState judul="Tidak ada pendaftar yang cocok" deskripsi="Ubah kata kunci atau filter, atau hapus filter untuk melihat semua." />
        </div>
      ) : (
        <div className="relative mt-6 overflow-x-auto rounded-kartu border border-garis bg-permukaan">
          <table className="w-full min-w-[60rem] text-left text-sm">
            <caption className="sr-only">Daftar pendaftar</caption>
            <thead className="border-b border-garis bg-permukaan-alt text-tinta-redup">
              <tr>
                {KOLOM.slice(0, 2).map((k) => (
                  <KepalaUrut key={k.urut} k={k} filter={filter} aktif={urutAktif === k.urut} arah={arahAktif} />
                ))}
                <th scope="col" className="px-3 py-2.5 font-semibold">NISN</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Asal sekolah</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Jurusan</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">NIK</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">No. HP</th>
                {KOLOM.slice(2).map((k) => (
                  <KepalaUrut key={k.urut} k={k} filter={filter} aktif={urutAktif === k.urut} arah={arahAktif} />
                ))}
              </tr>
            </thead>
            <tbody>
              {hasil.baris.map((b) => (
                <tr key={b.id} className="border-b border-garis last:border-0 hover:bg-permukaan-alt/60">
                  <td className="angka whitespace-nowrap px-3 py-2.5 font-semibold">
                    <Link href={`/admin/peserta/${b.id}`} className="text-primer-tua underline underline-offset-4">
                      {b.nomor}
                    </Link>
                    {b.sumber === "luring" && <span className="ml-1.5 rounded bg-permukaan-alt px-1.5 py-0.5 text-xs font-semibold text-tinta-redup">luring</span>}
                  </td>
                  <td className="px-3 py-2.5 font-medium">{b.nama}</td>
                  <td className="angka px-3 py-2.5">{b.nisn ?? "-"}</td>
                  <td className="px-3 py-2.5">{b.asalSekolah ?? "-"}</td>
                  <td className="px-3 py-2.5">{b.jurusan ?? "-"}</td>
                  <td className="angka whitespace-nowrap px-3 py-2.5 text-tinta-redup">{b.nik || "-"}</td>
                  <td className="angka whitespace-nowrap px-3 py-2.5 text-tinta-redup">{b.hp || "-"}</td>
                  <td className="angka whitespace-nowrap px-3 py-2.5 text-tinta-redup">{formatTanggal(b.dikirim)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasil.jumlahHalaman > 1 && <Halaman filter={filter} halaman={hasil.halaman} jumlah={hasil.jumlahHalaman} />}
    </div>
  );
}

function KepalaUrut({ k, filter, aktif, arah }: { k: { urut: NonNullable<FilterPeserta["urut"]>; label: string }; filter: FilterPeserta; aktif: boolean; arah: "asc" | "desc" }) {
  const berikut = aktif && arah === "asc" ? "desc" : "asc";
  return (
    <th scope="col" aria-sort={aktif ? (arah === "asc" ? "ascending" : "descending") : "none"} className="px-3 py-2.5 font-semibold">
      <Link href={`/admin/peserta${queryFilter(filter, { urut: k.urut, arah: berikut, halaman: 1 })}`} className={cn("inline-flex min-h-8 items-center gap-1 hover:text-tinta", aktif && "text-tinta")}>
        {k.label}
        {aktif && (arah === "asc" ? <ArrowUpIcon aria-hidden className="size-3.5" /> : <ArrowDownIcon aria-hidden className="size-3.5" />)}
        <span className="sr-only">, urutkan</span>
      </Link>
    </th>
  );
}

function Halaman({ filter, halaman, jumlah }: { filter: FilterPeserta; halaman: number; jumlah: number }) {
  const href = (n: number) => `/admin/peserta${queryFilter(filter, { halaman: n })}`;
  const gaya = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-kontrol border border-garis px-3 text-sm font-semibold hover:bg-permukaan-alt";
  return (
    <nav aria-label="Halaman" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-tinta-redup">
        Halaman <span className="angka font-semibold text-tinta">{halaman}</span> dari <span className="angka">{jumlah}</span>
      </p>
      <div className="flex gap-2">
        {halaman > 1 ? (
          <Link href={href(halaman - 1)} className={gaya}>
            Sebelumnya
          </Link>
        ) : (
          <span className={cn(gaya, "pointer-events-none opacity-50")} aria-disabled>
            Sebelumnya
          </span>
        )}
        {halaman < jumlah ? (
          <Link href={href(halaman + 1)} className={gaya}>
            Berikutnya
          </Link>
        ) : (
          <span className={cn(gaya, "pointer-events-none opacity-50")} aria-disabled>
            Berikutnya
          </span>
        )}
      </div>
    </nav>
  );
}
