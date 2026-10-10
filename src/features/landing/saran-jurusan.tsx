"use client";

import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/cn";

// Contoh simulasi dari kriteria terima PRD v3.1 12.4. Skor dihitung dengan rumus 12.1 dan bobot 12.3:
// nilai Matematika 90, IPS 86, B. Indonesia 80, IPA 70, mata pelajaran lain 75.
const CONTOH = [
  { kode: "AKL", skor: 84.5, label: "Paling Sesuai", utama: true },
  { kode: "MPLB", skor: 80.75, label: "Alternatif", utama: false },
  { kode: "TKR", skor: 77.75, label: "Alternatif", utama: false },
  { kode: "FKK", skor: 76.5, label: "Alternatif", utama: false },
];

const koma = (n: number) => n.toFixed(1).replace(".", ",");

export function SaranJurusan() {
  const kurangiGerak = useReducedMotion();

  return (
    <section aria-labelledby="judul-saran" className="bg-permukaan-alt/60 py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 lg:grid-cols-[1fr_1.05fr] lg:gap-20 lg:px-8">
        <Reveal>
          <h2 id="judul-saran" className="text-3xl font-extrabold text-primer-tua sm:text-4xl lg:text-5xl">
            Bingung memilih jurusan? Biarkan nilai rapor bicara.
          </h2>
          <p className="mt-5 max-w-prose text-lg text-tinta-redup">
            Setelah rapor diunggah, sistem menghitung kecocokan tiap jurusan dari mata pelajaran yang paling berpengaruh. Setiap
            hasil disertai rincian, jadi mudah dibicarakan dengan orang tua dan guru. Ini saran, bukan keputusan.
          </p>
        </Reveal>

        <div className="rounded-kartu border border-garis bg-permukaan p-5 shadow-kartu sm:p-7">
          <ul className="flex flex-col gap-5">
            {CONTOH.map((c, i) => (
              <li key={c.kode}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-2xl font-extrabold text-tinta">{c.kode}</p>
                  <p className="angka text-lg font-bold text-tinta">{koma(c.skor)}</p>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-permukaan-alt">
                  <motion.div
                    className={cn("h-full origin-left rounded-full", c.utama ? "bg-primer" : "bg-primer/45")}
                    style={{ width: `${c.skor}%` }}
                    initial={kurangiGerak ? false : { scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <p className={cn("mt-1.5 text-sm font-semibold", c.utama ? "text-sukses" : "text-tinta-redup")}>{c.label}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-garis pt-4 text-sm text-tinta-redup">
            Contoh simulasi, bukan data pendaftar. Nilai yang dipakai: Matematika 90, IPS 86, Bahasa Indonesia 80, IPA 70, mata
            pelajaran lain 75.
          </p>
        </div>
      </div>
    </section>
  );
}
