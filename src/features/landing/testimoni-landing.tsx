import { Reveal } from "@/components/motion/reveal";
import type { TestimoniLanding as Testimoni } from "@/server/actions/ambilLanding";
import { TestimoniGeser } from "./testimoni-geser";

/** Kesan alumni dan wali murid dari admin. Disembunyikan bila belum ada. */
export function TestimoniLanding({ testimoni }: { testimoni: Testimoni[] }) {
  if (testimoni.length === 0) return null;

  return (
    <section id="testimoni" aria-labelledby="judul-testimoni" className="bg-permukaan py-16 lg:py-24">
      <div className="wadah">
        <h2 id="judul-testimoni" className="max-w-[18ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[1.12] tracking-[-0.015em] text-ink lg:leading-[0.96]">
          Kata mereka yang sudah belajar di sini.
        </h2>
        <Reveal>
          <TestimoniGeser testimoni={testimoni} />
        </Reveal>
      </div>
    </section>
  );
}
