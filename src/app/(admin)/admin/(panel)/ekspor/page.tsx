import type { ReactNode } from "react";
import { FilePdfIcon, MicrosoftExcelLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { FilterPesertaForm } from "@/features/admin/peserta/filter-form";
import { queryFilter } from "@/features/admin/peserta/query";
import { bacaFilter, daftarPeserta } from "@/server/actions/peserta";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";
import { prisma } from "@/server/db/client";
import { ambilKonfigWizard } from "@/server/services/draf";
import { MAKS_BARIS_REKAP } from "@/server/services/pdf/rekap";
import { MAKS_BARIS_EKSPOR } from "@/server/services/xlsx";

export const metadata = { title: "Ekspor data" };

export default async function HalamanEkspor({ searchParams }: PageProps<"/admin/ekspor">) {
  await wajibPeranHalaman(...PERAN.pendaftar);
  const filter = bacaFilter(await searchParams);
  const [{ tahunAjaran }, jurusan] = await Promise.all([
    ambilKonfigWizard(),
    prisma.jurusan.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" }, select: { kode: true } }),
  ]);
  const { total } = await daftarPeserta({ ...filter, halaman: 1 }, tahunAjaran);
  const q = queryFilter({ ...filter, halaman: undefined });
  const bolehXlsx = total > 0 && total <= MAKS_BARIS_EKSPOR;
  const bolehPdf = total > 0 && total <= MAKS_BARIS_REKAP;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold text-ink">Ekspor data</h1>
      <p className="mt-1 max-w-[66ch] text-tinta-redup">
        Unduh data pendaftar sesuai filter di bawah: spreadsheet lengkap (XLSX) atau rekap PDF untuk arsip dan tanda tangan panitia. Berkas memuat data pribadi, jadi setiap
        unduhan dicatat di audit log.
      </p>

      <FilterPesertaForm filter={filter} jurusan={jurusan.map((j) => j.kode)} periodeAktif={tahunAjaran} aksi="/admin/ekspor" />

      <section aria-labelledby="hasil-ekspor" className="mt-6 rounded-kartu border border-garis bg-permukaan p-5">
        <h2 id="hasil-ekspor" className="text-lg font-bold text-ink">
          <span className="angka">{total}</span> pendaftar akan diekspor
        </h2>
        {total > MAKS_BARIS_EKSPOR && <p className="mt-2 text-sm font-semibold text-bahaya">Terlalu banyak data (maksimal {MAKS_BARIS_EKSPOR} untuk XLSX, {MAKS_BARIS_REKAP} untuk PDF). Persempit filter.</p>}
        {total === 0 && <p className="mt-2 text-sm text-tinta-redup">Tidak ada pendaftar yang cocok dengan filter ini.</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <TombolUnduh aktif={bolehXlsx} href={`/api/v1/admin/ekspor/xlsx${q}`} utama>
            <MicrosoftExcelLogoIcon aria-hidden className="size-5" />
            Unduh XLSX
          </TombolUnduh>
          <TombolUnduh aktif={bolehPdf} href={`/api/v1/admin/ekspor/rekap${q}`} tabBaru>
            <FilePdfIcon aria-hidden className="size-5" />
            Buka rekap PDF
          </TombolUnduh>
        </div>
      </section>
    </div>
  );
}

/** Tautan unduh; bila tidak ada data, tampil sebagai tombol nonaktif (bukan tautan) supaya jelas tidak bisa dipakai. */
function TombolUnduh({ aktif, href, utama, tabBaru, children }: { aktif: boolean; href: string; utama?: boolean; tabBaru?: boolean; children: ReactNode }) {
  const dasar = "inline-flex min-h-11 items-center gap-2 rounded-kontrol px-5 text-sm font-semibold";
  const warna = utama ? "bg-primer text-primer-tinta hover:bg-primer-tua" : "border border-primer text-primer-tua hover:bg-permukaan-alt";
  if (!aktif) {
    return (
      <span aria-disabled="true" className={`${dasar} ${warna} cursor-not-allowed opacity-50`}>
        {children}
      </span>
    );
  }
  return (
    <a href={href} {...(tabBaru ? { target: "_blank", rel: "noopener" } : {})} className={`${dasar} ${warna}`}>
      {children}
    </a>
  );
}
