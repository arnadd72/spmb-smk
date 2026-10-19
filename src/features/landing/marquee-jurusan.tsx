"use client";

import { useRef } from "react";
import { useGsapPublik } from "@/components/motion/use-gsap";

const KODE = ["AKL", "MPLB", "LPK3", "TKR"];
const WARNA_KODE: Record<string, string> = {
  AKL: "text-primer",
  MPLB: "text-ink",
  LPK3: "text-jurusan-lpk3",
  TKR: "text-jurusan-tkr",
};

// Satu-satunya marquee di halaman. Laju dan kemiringannya mengikuti kecepatan gulir pengguna.
export function MarqueeJurusan() {
  const akar = useRef<HTMLElement>(null);

  useGsapPublik(akar, {
    animasi: ({ gsap, ScrollTrigger, akar: el }) => {
      const jalur = el.querySelector<HTMLElement>("[data-jalur]");
      if (!jalur) return;

      const gerak = gsap.to(jalur, { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
      const miring = gsap.quickTo(jalur, "skewX", { duration: 0.4, ease: "power3.out" });

      const st = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          const v = self.getVelocity();
          gsap.to(gerak, { timeScale: (v < 0 ? -1 : 1) * (1 + Math.min(Math.abs(v) / 450, 7)), duration: 0.25, overwrite: true });
          gsap.to(gerak, { timeScale: v < 0 ? -1 : 1, duration: 1, delay: 0.25, overwrite: "auto" });
          miring(Math.max(-8, Math.min(8, v / -300)));
        },
      });

      return () => st.kill();
    },
  });

  const isi = KODE.flatMap((k) => [k, "/"]);

  return (
    <section ref={akar} aria-hidden className="overflow-hidden bg-mint py-4 text-ink lg:py-5">
      <div data-jalur className="flex w-max whitespace-nowrap">
        {[0, 1].map((salinan) => (
          <div key={salinan} className="flex shrink-0 items-center gap-6 pr-6 lg:gap-10 lg:pr-10">
            {[...isi, ...isi].map((t, i) => (
              <span
                key={`${salinan}-${i}`}
                className={
                  t === "/"
                    ? "font-display text-[clamp(1.5rem,3.6vw,3rem)] font-medium leading-none text-ink/40"
                    : `font-display text-[clamp(2rem,5.5vw,4.5rem)] font-bold leading-none tracking-[-0.015em] ${WARNA_KODE[t] ?? "text-ink"}`
                }
              >
                {t}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
