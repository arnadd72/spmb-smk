"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PlusIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { FaqLanding } from "@/server/actions/ambilLanding";

export function FaqLanding({ faq }: { faq: FaqLanding[] }) {
  const [buka, setBuka] = useState<string | null>(null);
  const prefix = useId();
  const kurangiGerak = useReducedMotion();

  if (faq.length === 0) return null;

  return (
    <section id="faq" aria-labelledby="judul-faq" className="bg-latar py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8">
        <h2 id="judul-faq" className="text-3xl font-extrabold text-primer-tua sm:text-4xl lg:text-5xl">
          Pertanyaan yang sering muncul.
        </h2>

        <ul className="divide-y divide-garis border-y border-garis">
          {faq.map((f) => {
            const terbuka = buka === f.id;
            const idJawaban = `${prefix}-${f.id}`;
            return (
              <li key={f.id}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={terbuka}
                    aria-controls={idJawaban}
                    onClick={() => setBuka(terbuka ? null : f.id)}
                    className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-lg font-bold text-tinta"
                  >
                    {f.pertanyaan}
                    <PlusIcon
                      aria-hidden
                      weight="bold"
                      className={cn("size-5 shrink-0 text-primer transition-transform duration-300", terbuka && "rotate-45")}
                    />
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
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 pr-9 text-tinta-redup">{f.jawaban}</p>
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
