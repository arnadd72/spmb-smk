import Link from "next/link";
import { ArrowRightIcon, CalendarBlankIcon, MapPinIcon } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/motion/reveal";
import { GambarKonten } from "@/features/berita/gambar-konten";
import { formatTanggal } from "@/lib/format";
import type { BeritaRingkas, EventRingkas } from "@/server/actions/ambilPublik";

/** Berita dan agenda terbaru dari admin. Disembunyikan sepenuhnya bila keduanya kosong. */
export function KabarTerbaru({ berita, agenda }: { berita: BeritaRingkas[]; agenda: EventRingkas[] }) {
  if (berita.length === 0 && agenda.length === 0) return null;

  return (
    <section id="kabar" aria-labelledby="judul-kabar" className="py-16 lg:py-24">
      <div className="wadah">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="judul-kabar" className="max-w-[16ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[0.96] tracking-[-0.015em] text-ink">
            Kabar dari sekolah.
          </h2>
          <Link href="/berita" className="inline-flex min-h-11 items-center gap-2 font-bold text-primer-tua underline decoration-2 underline-offset-4">
            Semua berita
            <ArrowRightIcon aria-hidden weight="bold" className="size-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14">
          {berita.length > 0 && (
            <ul className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3 lg:max-xl:grid-cols-2">
              {berita.map((b, i) => (
                <li key={b.slug}>
                  <Reveal tunda={i * 0.06}>
                    <Link href={`/berita/${b.slug}`} className="group block">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-kartu bg-permukaan-alt">
                        {b.gambar && (
                          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                            <GambarKonten src={b.gambar} alt="" sizes="(min-width: 1280px) 22vw, (min-width: 640px) 40vw, 100vw" />
                          </div>
                        )}
                      </div>
                      <p className="mt-4 text-sm font-semibold text-tinta-redup">{formatTanggal(b.tanggal)}</p>
                      <h3 className="mt-1 text-xl font-bold leading-tight text-ink underline-offset-4 group-hover:underline">{b.judul}</h3>
                      {b.cuplikan && <p className="mt-2 line-clamp-2 text-tinta-redup">{b.cuplikan}</p>}
                    </Link>
                  </Reveal>
                </li>
              ))}
            </ul>
          )}

          {agenda.length > 0 && (
            <aside aria-labelledby="judul-agenda-landing" className="h-fit rounded-kartu bg-kuning p-6 text-ink lg:sticky lg:top-24">
              <h3 id="judul-agenda-landing" className="text-2xl font-bold">
                Agenda
              </h3>
              <ul className="mt-4 flex flex-col gap-4">
                {agenda.map((a) => (
                  <li key={a.slug} className="border-t border-ink/20 pt-4 first:border-t-0 first:pt-0">
                    <p className="text-lg font-bold leading-snug">{a.judul}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                      <CalendarBlankIcon aria-hidden weight="bold" className="size-4" />
                      {formatTanggal(a.tanggal)}
                    </p>
                    {a.lokasi && (
                      <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold">
                        <MapPinIcon aria-hidden weight="bold" className="size-4" />
                        {a.lokasi}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
