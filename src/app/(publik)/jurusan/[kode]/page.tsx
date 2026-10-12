import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { TAMPIL_JURUSAN, TAMPIL_STANDAR } from "@/features/jurusan/tampil";
import { cn } from "@/lib/cn";
import { formatAngka } from "@/lib/format";
import { ambilDaftarJurusan, ambilJurusanPublik } from "@/server/actions/ambilPublik";

export const revalidate = 300;

async function cari(kode: string) {
  try {
    return await ambilJurusanPublik(kode);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps<"/jurusan/[kode]">) {
  const { kode } = await params;
  const j = await cari(kode);
  return j ? { title: `${j.nama} (${j.kode})`, description: j.deskripsi } : { title: "Jurusan tidak ditemukan" };
}

export default async function DetailJurusan({ params }: PageProps<"/jurusan/[kode]">) {
  const { kode } = await params;
  const j = await cari(kode);
  if (!j) notFound(); // kode tidak ada atau jurusan nonaktif

  const t = TAMPIL_JURUSAN[j.kode] ?? TAMPIL_STANDAR;
  const lainnya = (await ambilDaftarJurusan().catch(() => [])).filter((x) => x.kode !== j.kode);
  const bobotMaks = Math.max(...j.mapelUtama.map((m) => m.bobot), 0.01);

  return (
    <article>
      <header className={cn("py-12 lg:py-20", t.latar, t.teks)}>
        <div className="wadah grid items-end gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <Link href="/jurusan" className="inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">
              Semua program keahlian
            </Link>
            <h1 className={cn("mt-4 font-display text-[clamp(4rem,9vw,7rem)] font-bold leading-[0.82] tracking-[-0.03em]", t.kode)}>
              {j.kode}
            </h1>
            <p className="mt-5 max-w-[26ch] text-[clamp(1.35rem,2.4vw,1.9rem)] font-bold leading-tight">{j.nama}</p>
            <p className="mt-3 max-w-[56ch] text-lg font-medium">{j.deskripsi}</p>
          </div>
          {t.foto && (
            <div className="relative aspect-[16/10] overflow-hidden rounded-kartu">
              <Image src={t.foto.src} alt={t.foto.alt} fill priority sizes="(min-width: 1024px) 40vw, 100vw" className={cn("object-cover", t.foto.posisi)} />
            </div>
          )}
        </div>
      </header>

      <div className="wadah grid gap-12 py-12 lg:grid-cols-3 lg:gap-16 lg:py-20">
        <Reveal className="rounded-kartu border border-garis bg-permukaan p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-ink">Daya tampung</h2>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[
              ["Kuota", j.kuota],
              ["Pilihan 1", j.terdaftar],
              ["Sisa", j.sisa],
            ].map(([label, nilai]) => (
              <div key={label as string} className="rounded-kontrol bg-permukaan-alt p-3">
                <dd className="angka font-display text-3xl font-bold text-ink">{nilai}</dd>
                <dt className="text-sm text-tinta-redup">{label}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-tinta-redup">
            Kursi yang penuh tidak menutup pendaftaran. Keputusan akhir ada di panitia.
          </p>
        </Reveal>

        <Reveal tunda={0.06} className="rounded-kartu border border-garis bg-permukaan p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-ink">Nilai rapor yang berpengaruh</h2>
          {j.mapelUtama.length === 0 ? (
            <p className="mt-4 text-tinta-redup">Bobot mata pelajaran belum diatur.</p>
          ) : (
            <ul className="mt-5 flex flex-col gap-4">
              {j.mapelUtama.map((m) => (
                <li key={m.nama}>
                  <div className="flex items-baseline justify-between gap-3 text-sm font-semibold text-ink">
                    <span>{m.nama}</span>
                    <span className="angka">{formatAngka(m.bobot * 100, 0)}%</span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-permukaan-alt">
                    <div className="h-full rounded-full bg-primer" style={{ width: `${(m.bobot / bobotMaks) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        <Reveal tunda={0.12} className="rounded-kartu border border-garis bg-permukaan p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-ink">Prospek karier</h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {j.prospekKarir.map((k) => (
              <li key={k} className="rounded-full bg-permukaan-alt px-3.5 py-1.5 text-sm font-semibold text-ink">
                {k}
              </li>
            ))}
          </ul>
          {j.keunggulan.length > 0 && (
            <>
              <h2 className="mt-8 text-2xl font-bold text-ink">Keunggulan</h2>
              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-tinta">
                {j.keunggulan.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </>
          )}
        </Reveal>
      </div>

      <div className="wadah pb-16 lg:pb-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-kartu bg-ink p-7 text-kertas sm:p-10 lg:flex-row lg:items-center">
          <p className="max-w-[28ch] font-display text-3xl font-bold leading-tight lg:text-4xl">
            Tertarik dengan {j.kode}? Daftar dan lihat kecocokan nilai rapor Anda.
          </p>
          <Link href="/daftar" className="w-full sm:w-auto">
            <Button ukuran="lg" className="w-full sm:w-auto">
              Daftar Sekarang
            </Button>
          </Link>
        </div>

        {lainnya.length > 0 && (
          <nav aria-label="Jurusan lain" className="mt-10">
            <h2 className="text-xl font-bold text-ink">Program keahlian lain</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {lainnya.map((x) => (
                <li key={x.kode}>
                  <Link
                    href={`/jurusan/${x.kode.toLowerCase()}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-kontrol border border-garis bg-permukaan px-4 font-bold text-ink hover:bg-permukaan-alt"
                  >
                    {x.kode}
                    <ArrowRightIcon aria-hidden weight="bold" className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </article>
  );
}
