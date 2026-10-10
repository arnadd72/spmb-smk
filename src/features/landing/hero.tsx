"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { FotoDuotone } from "./foto-duotone";

// Copy hero: usulan awal, final dari sekolah (keputusan S14).
export function Hero({ tahunAjaran }: { tahunAjaran: string | null }) {
  const akar = useRef<HTMLElement>(null);
  const kurangiGerak = useReducedMotion();

  useGsapPublik(akar, {
    animasi: ({ gsap, SplitText, akar: el }) => {
      // Judul muncul per baris sekali, di bawah 800 ms (PRD 16.5).
      const judul = el.querySelector<HTMLElement>("[data-judul]");
      if (judul) {
        const split = SplitText.create(judul, { type: "lines", mask: "lines", linesClass: "baris-judul" });
        gsap.from(split.lines, { yPercent: 105, duration: 0.7, ease: "power3.out", stagger: 0.1 });
      }
      gsap.from("[data-masuk]", { opacity: 0, y: 14, duration: 0.5, ease: "power2.out", stagger: 0.08, delay: 0.35 });

      // Foto bergeser pelan saat halaman digulir (parallax ringan).
      gsap.to("[data-foto]", {
        yPercent: -8,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
      });
    },
  });

  return (
    <section ref={akar} className="relative overflow-hidden">
      {/* Ornamen anyaman halus, hanya di hero dan footer (PRD 16.2). */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-[34rem] rounded-full opacity-[0.07]"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, var(--hijau-nu) 0deg 6deg, transparent 6deg 12deg)",
          maskImage: "radial-gradient(circle, black 30%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14 lg:px-8 lg:py-8">
        <div>
          <h1
            data-judul
            className="text-[clamp(2.5rem,4.6vw,4.5rem)] font-extrabold leading-[1.02] text-primer-tua"
          >
            Belajar terampil, tumbuh berakhlak.
          </h1>
          <p data-masuk className="mt-6 max-w-[34ch] text-lg leading-relaxed text-tinta-redup sm:text-xl">
            SMK Pusat Keunggulan di Wangon, Banyumas. Daftar tanpa akun, unggah rapor, dan dapatkan saran jurusan yang cocok.
          </p>
          <div data-masuk className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/daftar/langkah/1" className="sm:w-auto">
              <Button varian="aksen" ukuran="lg" className="w-full sm:w-auto">
                Daftar Sekarang
              </Button>
            </Link>
            <Link href="/cek-status" className="sm:w-auto">
              <Button varian="sekunder" ukuran="lg" className="w-full sm:w-auto">
                Cek Status
              </Button>
            </Link>
          </div>
          {tahunAjaran && (
            <p data-masuk className="angka mt-6 text-sm font-semibold text-tinta-redup">
              Penerimaan murid baru tahun ajaran {tahunAjaran}
            </p>
          )}
        </div>

        <motion.div
          className="relative mx-auto w-full max-w-xl lg:max-w-none"
          initial={kurangiGerak ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Bingkai tidak simetris: blok hijau bergeser di belakang foto berpotongan diagonal. */}
          <div aria-hidden className="absolute -bottom-2 -left-2 h-[88%] w-[88%] sm:-bottom-4 sm:-left-4 rounded-kartu bg-primer/90" />
          <div data-foto className="relative will-change-transform">
            <FotoDuotone
              src="/images/sekolah/istighotsah.webp"
              alt="Siswa SMK Ma'arif NU 1 Wangon berkumpul untuk istighotsah di aula sekolah"
              width={1280}
              height={960}
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              pembungkus="aspect-[4/5] w-full rounded-kartu [clip-path:polygon(0_0,100%_0,100%_86%,86%_100%,0_100%)] sm:aspect-[5/5] lg:aspect-[4/5]"
              className="size-full"
            />
          </div>

          {/* Stempel kecil dengan fakta dari logo resmi sekolah. */}
          <div className="absolute -bottom-5 right-3 flex items-center gap-3 rounded-kartu border border-garis bg-permukaan px-3 py-2.5 shadow-kartu sm:right-6">
            <Image src="/images/sekolah/lambang.png" alt="" width={44} height={44} className="size-11 object-contain" />
            <p className="text-sm font-bold leading-tight text-primer-tua">
              SMK Pusat
              <br />
              Keunggulan
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
