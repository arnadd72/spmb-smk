"use client";

import { useRef } from "react";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { cn } from "@/lib/cn";

// Contoh simulasi dari kriteria terima PRD v3.1 12.4. Skor dihitung dengan rumus 12.1 dan bobot 12.3:
// nilai Matematika 90, IPS 86, B. Indonesia 80, IPA 70, mata pelajaran lain 75.
const CONTOH = [
  { kode: "AKL", skor: 84.5, label: "Paling Sesuai", utama: true, warna: "bg-kuning" },
  { kode: "MPLB", skor: 80.75, label: "Alternatif", utama: false, warna: "bg-ink" },
  { kode: "TKR", skor: 77.75, label: "Alternatif", utama: false, warna: "bg-ink" },
  { kode: "FKK", skor: 76.5, label: "Alternatif", utama: false, warna: "bg-ink" },
];

const koma = (n: number) => n.toFixed(1).replace(".", ",");

export function SaranJurusan() {
  const akar = useRef<HTMLElement>(null);

  // Angka menghitung naik dan batang terisi saat kartu terlihat (data tidak berubah, hanya penyajian).
  useGsapPublik(akar, {
    animasi: ({ gsap, SplitText, akar: el }) => {
      const judul = el.querySelector<HTMLElement>("[data-judul-saran]");
      const split = judul ? SplitText.create(judul, { aria: "none", type: "words", mask: "words" }) : null;
      if (split) {
        gsap.from(split.words, {
          yPercent: 110,
          duration: 0.8,
          ease: "expo.out",
          stagger: 0.05,
          scrollTrigger: { trigger: judul, start: "top 85%", once: true },
        });
      }

      const tl = gsap.timeline({ scrollTrigger: { trigger: el.querySelector("[data-kartu-skor]"), start: "top 75%", once: true } });
      el.querySelectorAll<HTMLElement>("[data-baris]").forEach((baris, i) => {
        const skor = Number(baris.dataset.skor);
        const angka = baris.querySelector<HTMLElement>("[data-angka]");
        const batang = baris.querySelector<HTMLElement>("[data-batang]");
        const nilai = { v: 0 };
        const posisi = i * 0.12;
        if (batang) tl.fromTo(batang, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: "expo.out" }, posisi);
        tl.to(
          nilai,
          {
            v: skor,
            duration: 1.2,
            ease: "expo.out",
            onUpdate: () => {
              if (angka) angka.textContent = koma(nilai.v);
            },
          },
          posisi,
        );
      });

      return () => split?.revert();
    },
  });

  return (
    <section ref={akar} aria-labelledby="judul-saran" className="bg-mint py-16 text-ink lg:py-24">
      <div className="wadah grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-24">
        <div>
          <h2
            id="judul-saran"
            data-judul-saran
            className="max-w-[14ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[0.96] tracking-[-0.015em]"
          >
            Bingung memilih jurusan? Biarkan nilai rapor bicara.
          </h2>
          <p className="mt-6 max-w-[48ch] text-base text-ink/80 lg:text-lg">
            Setelah rapor diunggah, sistem menghitung kecocokan tiap jurusan dari mata pelajaran yang paling berpengaruh. Setiap
            hasil disertai rincian, jadi mudah dibicarakan dengan orang tua dan guru. Ini saran, bukan keputusan.
          </p>
        </div>

        <div data-kartu-skor className="rounded-kartu bg-permukaan p-6 shadow-kartu sm:p-9">
          <ul className="flex flex-col gap-6">
            {CONTOH.map((c) => (
              <li key={c.kode} data-baris data-skor={c.skor}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-2xl font-bold">{c.kode}</p>
                  <p data-angka className="angka font-display text-2xl font-bold">
                    {koma(c.skor)}
                  </p>
                </div>
                <div className="mt-2 h-4 overflow-hidden rounded-full bg-permukaan-alt">
                  <div
                    data-batang
                    className={cn("h-full origin-left rounded-full", c.warna, !c.utama && "opacity-80")}
                    style={{ width: `${c.skor}%` }}
                  />
                </div>
                <p className={cn("mt-1.5 text-sm font-bold", c.utama ? "text-sukses" : "text-tinta-redup")}>{c.label}</p>
              </li>
            ))}
          </ul>
          <p className="mt-7 border-t border-garis pt-4 text-sm text-tinta-redup">
            Contoh simulasi, bukan data pendaftar. Nilai yang dipakai: Matematika 90, IPS 86, Bahasa Indonesia 80, IPA 70, mata
            pelajaran lain 75.
          </p>
        </div>
      </div>
    </section>
  );
}
