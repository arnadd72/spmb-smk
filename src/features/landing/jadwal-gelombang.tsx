import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { formatTanggal } from "@/lib/format";
import type { GelombangLanding } from "@/server/actions/ambilLanding";

const STATUS = {
  buka: { label: "Sedang dibuka", kelas: "bg-primer text-kertas" },
  belum: { label: "Segera dibuka", kelas: "bg-mint text-ink" },
  penuh: { label: "Kuota penuh", kelas: "bg-kunyit text-ink" },
  tutup: { label: "Sudah ditutup", kelas: "bg-permukaan-alt text-tinta-redup" },
} as const;

/** Jadwal gelombang pendaftaran (PRD v4 butir 44). Tidak tampil bila panitia belum membuat gelombang. */
export function JadwalGelombang({ gelombang }: { gelombang: GelombangLanding[] }) {
  if (gelombang.length === 0) return null;
  const berjalan = gelombang.find((g) => g.status === "buka");

  return (
    <section id="gelombang" aria-labelledby="judul-gelombang" className="bg-latar py-16 lg:py-24">
      <div className="wadah">
        <h2 id="judul-gelombang" className="max-w-[20ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[1.15] tracking-[-0.015em] text-ink">
          Jadwal gelombang pendaftaran.
        </h2>
        <p className="mt-3 max-w-[56ch] text-tinta-redup">
          {berjalan
            ? `${berjalan.nama} sedang dibuka sampai ${formatTanggal(berjalan.tutup)}${berjalan.sisa !== null ? `, sisa ${berjalan.sisa} kursi` : ""}.`
            : "Pendaftaran dibuka per gelombang. Pilih waktu yang sesuai dan daftar sebelum kuota gelombang terisi."}
        </p>

        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {gelombang.map((g) => {
            const s = STATUS[g.status];
            return (
              <li key={g.id} className="flex flex-col rounded-kartu border border-garis bg-permukaan p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xl font-bold text-ink">{g.nama}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.kelas}`}>{s.label}</span>
                </div>
                <p className="angka mt-3 font-semibold text-tinta">
                  {formatTanggal(g.buka)} <span className="font-normal text-tinta-redup">sampai</span> {formatTanggal(g.tutup)}
                </p>
                <p className="mt-1 text-sm text-tinta-redup">
                  {g.kuota === null ? "Tanpa batas kuota." : g.status === "tutup" ? `Kuota ${g.kuota} murid.` : `Kuota ${g.kuota} murid, sisa ${g.sisa}.`}
                </p>
              </li>
            );
          })}
        </ol>

        {berjalan && (
          <Link
            href="/daftar"
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-kontrol bg-primer px-5 text-sm font-bold text-primer-tinta hover:bg-primer-tua"
          >
            Daftar di {berjalan.nama}
            <ArrowRightIcon aria-hidden weight="bold" className="size-4" />
          </Link>
        )}
      </div>
    </section>
  );
}
