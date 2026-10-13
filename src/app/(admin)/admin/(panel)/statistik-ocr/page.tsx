import { EmptyState } from "@/components/ui/empty-state";
import { statistikOcr } from "@/server/actions/auditLog";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Statistik OCR" };

const NAMA = { akta: "Akta kelahiran", kk: "Kartu keluarga", rapor: "Rapor" } as const;

export default async function HalamanStatistikOcr() {
  await wajibPeranHalaman(...PERAN.sistem);
  const s = await statistikOcr();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-bold text-ink">Statistik OCR</h1>
      <p className="mt-1 max-w-[64ch] text-tinta-redup">
        Pembacaan dokumen otomatis berjalan di HP pendaftar (tanpa biaya dan tanpa kuota). Tabel ini menunjukkan jumlah per jenis, tingkat berhasil, dan kecepatan baca. Pembacaan yang gagal atau terlalu lama membuat pendaftar mengisi data secara manual.
      </p>

      {s.total === 0 ? (
        <div className="mt-6">
          <EmptyState
            judul="Belum ada pembacaan OCR"
            deskripsi="Belum ada pendaftar yang mengunggah dokumen. Statistik muncul di sini setelah pembacaan pertama."
          />
        </div>
      ) : (
        <>
          <section aria-labelledby="bulan-ocr" className="mt-6 rounded-kartu border border-garis bg-permukaan p-4">
            <h2 id="bulan-ocr" className="text-lg font-bold text-ink">
              Pembacaan bulan ini
            </h2>
            <p className="mt-1 text-sm text-tinta-redup">
              <span className="angka font-semibold text-tinta">{s.bulanIni}</span> pembacaan dari <span className="angka">{s.total}</span> pembacaan tercatat.
            </p>
          </section>

          <div className="relative mt-5 overflow-x-auto rounded-kartu border border-garis bg-permukaan">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">Statistik OCR per jenis dokumen</caption>
              <thead className="border-b border-garis bg-permukaan-alt text-tinta-redup">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Dokumen</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Jumlah</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Berhasil</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Median</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">p95</th>
                </tr>
              </thead>
              <tbody>
                {s.perJenis.map((j) => (
                  <tr key={j.jenis} className="border-b border-garis last:border-0">
                    <th scope="row" className="px-4 py-2.5 font-semibold">{NAMA[j.jenis as keyof typeof NAMA]}</th>
                    <td className="angka px-4 py-2.5 text-right">{j.jumlah}</td>
                    <td className="angka px-4 py-2.5 text-right">{j.jumlah ? `${Math.round((j.sukses / j.jumlah) * 100)}%` : "-"}</td>
                    <td className="angka px-4 py-2.5 text-right">{j.jumlah ? `${j.p50} ms` : "-"}</td>
                    <td className="angka px-4 py-2.5 text-right">{j.jumlah ? `${j.p95} ms` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
