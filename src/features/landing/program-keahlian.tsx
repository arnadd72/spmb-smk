"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { cn } from "@/lib/cn";
import type { JurusanLanding } from "@/server/actions/ambilLanding";
import { FotoDuotone } from "./foto-duotone";

// Foto hanya tersedia untuk TKR. Jurusan lain memakai tipografi kode sebagai visual utama (PRD 16.3).
const FOTO: Record<string, { src: string; alt: string }> = {
  TKR: {
    src: "/images/sekolah/praktik-tkr.webp",
    alt: "Siswa Teknik Kendaraan Ringan praktik memeriksa mobil di bengkel sekolah",
  },
};

function Ornamen() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 opacity-[0.16]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, var(--kertas) 0 1px, transparent 1px 22px), repeating-linear-gradient(-45deg, var(--kertas) 0 1px, transparent 1px 22px)",
      }}
    />
  );
}

function Panel({ j }: { j: JurusanLanding }) {
  const foto = FOTO[j.kode];
  return (
    <div className="grid h-full gap-6 lg:grid-rows-[minmax(0,1fr)_auto]">
      <div className="relative min-h-52 overflow-hidden rounded-kartu bg-hijau-tua lg:min-h-0">
        {foto ? (
          <FotoDuotone src={foto.src} alt={foto.alt} fill sizes="(min-width: 1024px) 40vw, 100vw" pembungkus="absolute inset-0" />
        ) : (
          <>
            <Ornamen />
            <p
              aria-hidden
              className="absolute inset-0 grid place-items-center font-display text-[clamp(5rem,16vw,11rem)] font-extrabold leading-none text-kertas/90"
            >
              {j.kode}
            </p>
          </>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-extrabold text-primer-tua sm:text-3xl">{j.nama}</h3>
        <p className="mt-2 max-w-prose text-tinta-redup">{j.deskripsi}</p>
        {j.mapelUtama.length > 0 && (
          <p className="mt-3 text-sm text-tinta">
            <span className="font-semibold">Nilai rapor yang paling berpengaruh:</span> {j.mapelUtama.join(", ")}.
          </p>
        )}
        {j.prospekKarir.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {j.prospekKarir.map((k) => (
              <li key={k} className="rounded-full bg-permukaan-alt px-3 py-1 text-sm font-semibold text-tinta">
                {k}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="angka text-sm font-semibold text-tinta-redup">Daya tampung {j.kuota} murid</p>
          <Link
            href={`/jurusan/${j.kode.toLowerCase()}`}
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primer-tua underline-offset-4 hover:underline"
          >
            Lihat jurusan {j.kode}
            <ArrowRightIcon aria-hidden weight="bold" className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ProgramKeahlian({ jurusan }: { jurusan: JurusanLanding[] }) {
  const akar = useRef<HTMLElement>(null);
  const [aktif, setAktif] = useState(0);
  const kurangiGerak = useReducedMotion();

  // Desktop: bagian ini di-pin dan gulir mengganti jurusan aktif. Tombol kode tetap bisa diklik/fokus.
  useGsapPublik(akar, {
    minLebar: 1024,
    animasi: ({ ScrollTrigger, akar: el }) => {
      const n = jurusan.length;
      if (n < 2) return;
      ScrollTrigger.create({
        trigger: el,
        start: "top top+=64",
        end: () => `+=${n * 55}%`,
        pin: true,
        scrub: true,
        onUpdate: (self) => setAktif(Math.min(n - 1, Math.floor(self.progress * n))),
      });
    },
  });

  if (jurusan.length === 0) return null;
  const j = jurusan[aktif] ?? jurusan[0];

  return (
    <section ref={akar} id="jurusan" aria-labelledby="judul-jurusan" className="bg-latar py-16 lg:flex lg:h-[calc(100dvh-4rem)] lg:items-center lg:py-0">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
        <Reveal>
          <h2 id="judul-jurusan" className="max-w-2xl text-3xl font-extrabold text-primer-tua sm:text-4xl lg:text-5xl">
            Empat program keahlian, satu tujuan: siap kerja dan berakhlak.
          </h2>
        </Reveal>

        <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
          <div role="tablist" aria-label="Program keahlian" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
            {jurusan.map((x, i) => (
              <button
                key={x.kode}
                role="tab"
                id={`tab-${x.kode}`}
                aria-selected={i === aktif}
                aria-controls="panel-jurusan"
                onClick={() => setAktif(i)}
                className={cn(
                  "group flex min-h-11 shrink-0 items-baseline gap-3 rounded-kontrol px-3 text-left font-display font-extrabold leading-none transition-colors duration-200",
                  "text-[clamp(2.25rem,9vw,3rem)] lg:px-0 lg:text-[clamp(3.5rem,8vw,7.5rem)]",
                  i === aktif ? "text-primer" : "text-tinta-redup/75 hover:text-primer-tua",
                )}
              >
                {x.kode}
                <span
                  className={cn(
                    "hidden h-1 w-10 origin-left rounded-full bg-aksen transition-transform duration-300 lg:block",
                    i === aktif ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </button>
            ))}
          </div>

          <div id="panel-jurusan" role="tabpanel" aria-labelledby={`tab-${j.kode}`} className="min-h-0 lg:h-[min(34rem,calc(100dvh-14rem))]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={j.kode}
                className="h-full"
                initial={kurangiGerak ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={kurangiGerak ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <Panel j={j} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-8 lg:hidden">
          <Link href="/daftar/langkah/1">
            <Button ukuran="lg" className="w-full">
              Daftar Sekarang
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
