import Link from "next/link";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { kontrolDasar } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import type { FilterPeserta } from "@/server/actions/peserta";

// Formulir filter berbasis GET (tanpa JavaScript): hasil bisa dibagikan sebagai tautan dan tombol kembali tetap bekerja.

function Pilih({ nama, label, nilai, opsi }: { nama: string; label: string; nilai?: string; opsi: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-tinta">
      {label}
      <select name={nama} defaultValue={nilai ?? ""} className={cn(kontrolDasar, "font-normal")}>
        <option value="">Semua</option>
        {opsi.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterPesertaForm({ filter, jurusan, periodeAktif, aksi = "/admin/peserta" }: { filter: FilterPeserta; jurusan: string[]; periodeAktif: string; aksi?: string }) {
  const adaFilter = Object.entries(filter).some(([k, v]) => v && !["halaman", "urut", "arah"].includes(k));

  return (
    <form method="get" action={aksi} role="search" aria-label="Cari dan saring pendaftar" className="mt-5 rounded-kartu border border-garis bg-permukaan p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-tinta">
          Cari
          <span className="relative">
            <MagnifyingGlassIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-tinta-redup" />
            <input
              type="search"
              name="q"
              defaultValue={filter.q ?? ""}
              placeholder="Nama, NISN, nomor, asal sekolah, NIK, atau no. HP"
              className={cn(kontrolDasar, "pl-10 font-normal")}
            />
          </span>
        </label>
        <button type="submit" className="inline-flex min-h-11 items-center justify-center self-end rounded-kontrol bg-primer px-5 text-sm font-semibold text-primer-tinta hover:bg-primer-tua">
          Terapkan
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Pilih
          nama="nilai"
          label="Status nilai"
          nilai={filter.nilai}
          opsi={[
            ["belumDicek", "Belum dicek"],
            ["sesuai", "Sesuai"],
            ["dikoreksi", "Dikoreksi"],
          ]}
        />
        <Pilih nama="jurusan" label="Jurusan pilihan 1" nilai={filter.jurusan} opsi={jurusan.map((k) => [k, k])} />
        <Pilih
          nama="sumber"
          label="Sumber"
          nilai={filter.sumber}
          opsi={[
            ["daring", "Daring"],
            ["luring", "Luring"],
          ]}
        />
        <Pilih
          nama="sinkron"
          label="Sinkron berkas"
          nilai={filter.sinkron}
          opsi={[
            ["menunggu", "Menunggu"],
            ["selesai", "Selesai"],
            ["gagal", "Gagal"],
          ]}
        />
        <label className="flex flex-col gap-1 text-sm font-semibold text-tinta">
          Periode
          <select name="periode" defaultValue={filter.periode ?? ""} className={cn(kontrolDasar, "font-normal")}>
            <option value="">Aktif ({periodeAktif})</option>
            <option value="semua">Semua periode</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-tinta">
          Dikirim dari
          <input type="date" name="dari" defaultValue={filter.dari ?? ""} className={cn(kontrolDasar, "font-normal")} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-tinta">
          Sampai
          <input type="date" name="sampai" defaultValue={filter.sampai ?? ""} className={cn(kontrolDasar, "font-normal")} />
        </label>
      </div>

      {adaFilter && (
        <p className="mt-3">
          <Link href={aksi} className="inline-flex min-h-11 items-center text-sm font-semibold text-primer-tua underline underline-offset-4">
            Hapus semua filter
          </Link>
        </p>
      )}
    </form>
  );
}
