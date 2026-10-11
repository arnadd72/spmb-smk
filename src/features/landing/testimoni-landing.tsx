import { Reveal } from "@/components/motion/reveal";
import { GambarKonten } from "@/features/berita/gambar-konten";
import type { TestimoniLanding as Testimoni } from "@/server/actions/ambilLanding";

/** Kesan alumni dan wali murid dari admin. Disembunyikan bila belum ada. */
export function TestimoniLanding({ testimoni }: { testimoni: Testimoni[] }) {
  if (testimoni.length === 0) return null;

  return (
    <section id="testimoni" aria-labelledby="judul-testimoni" className="bg-permukaan py-16 lg:py-24">
      <div className="wadah">
        <h2 id="judul-testimoni" className="max-w-[18ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[0.96] tracking-[-0.015em] text-ink">
          Kata mereka yang sudah belajar di sini.
        </h2>
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {testimoni.map((t, i) => (
            <li key={t.id}>
              <Reveal tunda={(i % 2) * 0.06}>
                <figure className="flex h-full flex-col justify-between gap-6 rounded-kartu bg-latar p-6 lg:p-8">
                  <blockquote className="text-lg font-medium leading-relaxed text-ink">&ldquo;{t.isi}&rdquo;</blockquote>
                  <figcaption className="flex items-center gap-3">
                    {t.foto ? (
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-permukaan-alt">
                        <GambarKonten src={t.foto} alt="" sizes="48px" />
                      </span>
                    ) : (
                      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-primer font-display text-lg font-bold text-primer-tinta">
                        {t.nama.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span>
                      <span className="block font-bold text-ink">{t.nama}</span>
                      {t.keterangan && <span className="block text-sm text-tinta-redup">{t.keterangan}</span>}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
