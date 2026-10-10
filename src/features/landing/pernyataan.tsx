"use client";

import { useRef } from "react";
import { useGsapPublik } from "@/components/motion/use-gsap";

// Kalimat dibuka kata demi kata mengikuti gulir (scrub). Semua fakta dari PRD dan logo resmi sekolah.
export function Pernyataan() {
  const akar = useRef<HTMLElement>(null);

  useGsapPublik(akar, {
    animasi: ({ gsap, SplitText, akar: el }) => {
      const teks = el.querySelector<HTMLElement>("[data-kalimat]");
      if (!teks) return;
      const split = SplitText.create(teks, { aria: "none", type: "words" });
      gsap.fromTo(
        split.words,
        { opacity: 0.5 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.12,
          scrollTrigger: { trigger: teks, start: "top 82%", end: "bottom 48%", scrub: true },
        },
      );
      return () => split.revert();
    },
  });

  return (
    <section ref={akar} aria-label="Tentang sekolah" className="bg-ink py-20 text-kertas lg:py-28">
      <div className="mx-auto max-w-[100rem] px-4 sm:px-6 lg:px-10">
        <p
          data-kalimat
          className="max-w-[26ch] font-display text-[clamp(1.5rem,3.2vw,2.9rem)] font-semibold leading-[1.08] tracking-[-0.012em] sm:max-w-[30ch] lg:max-w-[34ch]"
        >
          Di bawah naungan LP Ma&apos;arif NU Banyumas, kami menyiapkan{" "}
          <span className="text-kuning">empat program keahlian</span> dengan praktik langsung, dan membiasakan{" "}
          <span className="text-mint">akhlak</span> setiap hari.
        </p>
      </div>
    </section>
  );
}
