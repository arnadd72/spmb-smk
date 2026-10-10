import Link from "next/link";
import { CalendarBlankIcon, MapPinIcon } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/motion/reveal";
import { GambarKonten } from "@/features/berita/gambar-konten";
import { formatTanggal } from "@/lib/format";
import { ambilAgendaMendatang, ambilDaftarBerita, type BeritaRingkas, type EventRingkas } from "@/server/actions/ambilPublik";

export const revalidate = 300;
export const metadata = {
  title: "Berita dan agenda",
  description: "Kabar terbaru dan agenda kegiatan SMK Ma'arif NU 1 Wangon.",
};

async function muat(): Promise<{ berita: BeritaRingkas[]; agenda: EventRingkas[] }> {
  try {
    const [berita, agenda] = await Promise.all([ambilDaftarBerita(), ambilAgendaMendatang(5)]);
    return { berita, agenda };
  } catch {
    return { berita: [], agenda: [] };
  }
}

export default async function HalamanBerita() {
  const { berita, agenda } = await muat();

  return (
    <div className="wadah py-12 lg:py-20">
      <h1 className="max-w-[16ch] text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1] tracking-[-0.02em] text-ink">
        Berita dan agenda
      </h1>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <section aria-labelledby="judul-berita">
          <h2 id="judul-berita" className="sr-only">
            Berita terbaru
          </h2>
          {berita.length === 0 ? (
            <EmptyState judul="Belum ada berita" deskripsi="Berita dari panitia akan muncul di sini." />
          ) : (
            <ul className="grid gap-8 sm:grid-cols-2">
              {berita.map((b, i) => (
                <li key={b.slug}>
                  <Reveal tunda={(i % 2) * 0.06}>
                    <Link href={`/berita/${b.slug}`} className="group block">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-kartu bg-permukaan-alt">
                        {b.gambar && (
                          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                            <GambarKonten src={b.gambar} alt="" sizes="(min-width: 1024px) 30vw, 100vw" />
                          </div>
                        )}
                      </div>
                      <p className="mt-4 text-sm font-semibold text-tinta-redup">{formatTanggal(b.tanggal)}</p>
                      <h3 className="mt-1 text-2xl font-bold leading-tight text-ink underline-offset-4 group-hover:underline">{b.judul}</h3>
                      {b.cuplikan && <p className="mt-2 line-clamp-3 text-tinta-redup">{b.cuplikan}</p>}
                    </Link>
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside aria-labelledby="judul-agenda" className="h-fit rounded-kartu bg-kuning p-6 text-ink lg:sticky lg:top-24">
          <h2 id="judul-agenda" className="text-2xl font-bold">
            Agenda
          </h2>
          {agenda.length === 0 ? (
            <p className="mt-3 font-medium">Belum ada agenda mendatang.</p>
          ) : (
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
          )}
        </aside>
      </div>
    </div>
  );
}
