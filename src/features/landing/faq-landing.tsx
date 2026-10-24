"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useKurangiGerak } from "@/components/motion/use-kurangi-gerak";
import { PlusIcon } from "@phosphor-icons/react";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { cn } from "@/lib/cn";
import type { FaqLanding as FaqData } from "@/server/actions/ambilLanding";

export function FaqLanding({ faq }: { faq: FaqData[] }) {
  const akar = useRef<HTMLElement>(null);
  const [buka, setBuka] = useState<string | null>(null);
  const prefix = useId();
  const kurangiGerak = useKurangiGerak();

  useGsapPublik(akar, {
    animasi: ({ gsap, SplitText, akar: el }) => {
      const judul = el.querySelector<HTMLElement>("[data-judul-faq]");
      const split = judul ? SplitText.create(judul, { aria: "none", type: "words", mask: "words", wordsClass: "kata" }) : null;
      if (split) {
        gsap.from(split.words, {
          yPercent: 110,
          duration: 0.8,
          ease: "expo.out",
          stagger: 0.06,
          scrollTrigger: { trigger: judul, start: "top 85%", once: true },
        });
      }
      gsap.from("[data-item-faq]", {
        opacity: 0,
        y: 28,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.07,
        scrollTrigger: { trigger: el.querySelector("[data-daftar-faq]"), start: "top 82%", once: true },
      });
      return () => split?.revert();
    },
  });

  if (faq.length === 0) return null;

  return (
    <section ref={akar} id="faq" aria-labelledby="judul-faq" className="bg-latar py-16 lg:py-24">
      <div className="wadah grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
        <h2
          id="judul-faq"
          data-judul-faq
          className="max-w-[12ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[0.96] tracking-[-0.015em] text-ink"
        >
          Pertanyaan yang sering muncul.
        </h2>

        <ul data-daftar-faq className="divide-y divide-ink/15 border-y border-ink/15">
          {faq.map((f) => {
            const terbuka = buka === f.id;
            const idJawaban = `${prefix}-${f.id}`;
            return (
              <li key={f.id} data-item-faq>
                <h3>
                  <button
                    type="button"
                    aria-expanded={terbuka}
                    aria-controls={idJawaban}
                    onClick={() => setBuka(terbuka ? null : f.id)}
                    className="group flex min-h-16 w-full items-center justify-between gap-4 py-5 text-left font-display text-lg font-semibold text-ink lg:text-xl"
                  >
                    {f.pertanyaan}
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-300",
                        terbuka ? "bg-kuning" : "bg-ink text-kertas group-hover:bg-kuning group-hover:text-ink",
                      )}
                    >
                      <PlusIcon aria-hidden weight="bold" className={cn("size-5 transition-transform duration-300", terbuka && "rotate-45")} />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {terbuka && (
                    <motion.div
                      id={idJawaban}
                      role="region"
                      initial={kurangiGerak ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={kurangiGerak ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[60ch] pb-6 pr-14 text-base text-ink/75">{f.jawaban}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
