import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { kontrolDasar } from "@/components/ui/input";
import { labelAksi } from "@/features/admin/audit/label";
import { cn } from "@/lib/cn";
import { bacaFilterAudit, daftarAudit, type FilterAudit } from "@/server/actions/auditLog";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Audit log" };

const waktu = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(d);

function query(f: FilterAudit, halaman: number) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, halaman })) if (v !== undefined && v !== "" && !(k === "halaman" && Number(v) <= 1)) p.set(k, String(v));
  const s = p.toString();
  return `/admin/audit-log${s ? `?${s}` : ""}`;
}

export default async function HalamanAudit({ searchParams }: PageProps<"/admin/audit-log">) {
  await wajibPeranHalaman(...PERAN.sistem);
  const filter = bacaFilterAudit(await searchParams);
  const h = await daftarAudit(filter);
  const adaFilter = Boolean(filter.aksi || filter.oleh || filter.entitas || filter.q || filter.dari || filter.sampai);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold text-ink">Audit log</h1>
      <p className="mt-1 text-tinta-redup">
        <span className="angka font-semibold text-tinta">{h.total}</span> catatan. Nilai sensitif (NIK, nomor telepon) tersamarkan dan password tidak pernah dicatat.
      </p>

      <form method="get" action="/admin/audit-log" role="search" aria-label="Saring audit log" className="mt-5 rounded-kartu border border-garis bg-permukaan p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-tinta">
            Aksi
            <select name="aksi" defaultValue={filter.aksi ?? ""} className={cn(kontrolDasar, "font-normal")}>
              <option value="">Semua</option>
              {h.pilihan.aksi.map((a) => (
                <option key={a} value={a}>
                  {labelAksi(a)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-tinta">
            Dilakukan oleh
            <select name="oleh" defaultValue={filter.oleh ?? ""} className={cn(kontrolDasar, "font-normal")}>
              <option value="">Semua</option>
              {h.pilihan.pengguna.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nama}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-tinta">
            Objek
            <select name="entitas" defaultValue={filter.entitas ?? ""} className={cn(kontrolDasar, "font-normal")}>
              <option value="">Semua</option>
              {h.pilihan.entitas.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-tinta">
            ID objek
            <input name="q" defaultValue={filter.q ?? ""} placeholder="mis. 12 atau AKL" className={cn(kontrolDasar, "font-normal")} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-tinta">
            Dari tanggal
            <input type="date" name="dari" defaultValue={filter.dari ?? ""} className={cn(kontrolDasar, "font-normal")} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-tinta">
            Sampai tanggal
            <input type="date" name="sampai" defaultValue={filter.sampai ?? ""} className={cn(kontrolDasar, "font-normal")} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" className="inline-flex min-h-11 items-center rounded-kontrol bg-primer px-5 text-sm font-semibold text-primer-tinta hover:bg-primer-tua">
            Terapkan
          </button>
          {adaFilter && (
            <Link href="/admin/audit-log" className="inline-flex min-h-11 items-center text-sm font-semibold text-primer-tua underline underline-offset-4">
              Hapus filter
            </Link>
          )}
        </div>
      </form>

      {h.baris.length === 0 ? (
        <div className="mt-6">
          <EmptyState judul="Tidak ada catatan" deskripsi="Belum ada aktivitas yang cocok dengan filter ini." />
        </div>
      ) : (
        <div className="relative mt-6 overflow-x-auto rounded-kartu border border-garis bg-permukaan">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <caption className="sr-only">Catatan audit</caption>
            <thead className="border-b border-garis bg-permukaan-alt text-tinta-redup">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-semibold">Waktu</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Oleh</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Aksi</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Objek</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Rincian</th>
              </tr>
            </thead>
            <tbody>
              {h.baris.map((b) => (
                <tr key={b.id} className="border-b border-garis align-top last:border-0">
                  <td className="angka whitespace-nowrap px-4 py-2.5 text-tinta-redup">{waktu(b.waktu)}</td>
                  <td className="px-4 py-2.5">{b.oleh}</td>
                  <td className="px-4 py-2.5 font-semibold">
                    {labelAksi(b.aksi)}
                    <span className="block text-xs font-normal text-tinta-redup">{b.aksi}</span>
                  </td>
                  <td className="angka px-4 py-2.5">{b.entitas}</td>
                  <td className="px-4 py-2.5">
                    {b.dataLama || b.dataBaru ? (
                      <details>
                        <summary className="min-h-8 cursor-pointer font-semibold text-primer-tua">Lihat</summary>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {b.dataLama ? (
                            <div>
                              <p className="text-xs font-semibold text-tinta-redup">Sebelum</p>
                              <pre className="mt-1 max-w-xs overflow-x-auto whitespace-pre-wrap break-words rounded-kontrol bg-permukaan-alt p-2 text-xs">{JSON.stringify(b.dataLama, null, 2)}</pre>
                            </div>
                          ) : null}
                          {b.dataBaru ? (
                            <div>
                              <p className="text-xs font-semibold text-tinta-redup">Sesudah</p>
                              <pre className="mt-1 max-w-xs overflow-x-auto whitespace-pre-wrap break-words rounded-kontrol bg-permukaan-alt p-2 text-xs">{JSON.stringify(b.dataBaru, null, 2)}</pre>
                            </div>
                          ) : null}
                        </div>
                      </details>
                    ) : (
                      <span className="text-tinta-redup">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {h.jumlahHalaman > 1 && (
        <nav aria-label="Halaman" className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-tinta-redup">
            Halaman <span className="angka font-semibold text-tinta">{h.halaman}</span> dari <span className="angka">{h.jumlahHalaman}</span>
          </p>
          <div className="flex gap-2">
            {h.halaman > 1 && (
              <Link href={query(filter, h.halaman - 1)} className="inline-flex min-h-11 items-center rounded-kontrol border border-garis px-3 text-sm font-semibold hover:bg-permukaan-alt">
                Sebelumnya
              </Link>
            )}
            {h.halaman < h.jumlahHalaman && (
              <Link href={query(filter, h.halaman + 1)} className="inline-flex min-h-11 items-center rounded-kontrol border border-garis px-3 text-sm font-semibold hover:bg-permukaan-alt">
                Berikutnya
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
