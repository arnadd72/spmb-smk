"use client";

import Link from "next/link";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { GambarLogo } from "@/components/ui/gambar-logo";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { Magnetik } from "./magnetik";

export function Penutup({ logo }: { logo: string }) {
  const akar = useRef<HTMLElement>(null);

  useGsapPublik(akar, {
    animasi: ({ gsap, SplitText, akar: el }) => {
      const judul = el.querySelector<HTMLElement>("[data-judul-penutup]");
      const split = judul ? SplitText.create(judul, { aria: "none", type: "lines,words,chars", mask: "lines", linesClass: "baris", wordsClass: "kata-utuh" }) : null;
      if (split) {
        gsap.from(split.chars, {
          yPercent: 120,
          duration: 0.9,
          ease: "expo.out",
          stagger: 0.02,
          scrollTrigger: { trigger: judul, start: "top 82%", once: true },
        });
      }
      gsap.from("[data-aksi]", {
        opacity: 0,
        y: 24,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: el.querySelector("[data-aksi]"), start: "top 92%", once: true },
      });
      // Lambang besar bergeser pelan naik mengikuti gulir (tanpa berputar), hanya sebagai latar.
      gsap.fromTo("[data-lambang-latar]", { y: 90 }, { y: -90, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      return () => split?.revert();
    },
  });

  return (
    <section ref={akar} aria-labelledby="judul-penutup" className="relative overflow-hidden bg-ink py-20 text-kertas lg:py-28">
      <GambarLogo
        data-lambang-latar
        src={logo}
        alt=""
        width={800}
        height={800}
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 size-[18rem] -translate-y-1/2 sm:right-8 sm:size-[26rem] lg:right-20 lg:size-[32rem] object-contain opacity-[0.09]"
      />
      <div className="wadah relative">
        <h2
          id="judul-penutup"
          data-judul-penutup
          className="max-w-[14ch] text-[clamp(2.1rem,5.4vw,4.75rem)] font-bold leading-[1.08] tracking-[-0.02em] lg:leading-[0.92]"
        >
          Siapkan data diri, <span className="text-kuning">mulai</span> hari ini.
        </h2>
        <p data-aksi className="mt-6 max-w-[46ch] text-base text-kertas/80 lg:text-lg">
          Sudah mendaftar? Masukkan nomor pendaftaran dan tanggal lahir untuk melihat status pendaftaran.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Magnetik className="sm:inline-block" kekuatan={0.4}>
            <Link data-aksi href="/daftar" className="block">
              <Button ukuran="lg" className="w-full sm:w-auto">
                Daftar Sekarang
              </Button>
            </Link>
          </Magnetik>
          <Magnetik className="sm:inline-block" kekuatan={0.4}>
            <Link data-aksi href="/cek-pendaftaran" className="block">
              <Button varian="terang" ukuran="lg" className="w-full sm:w-auto">
                Cek Pendaftaran
              </Button>
            </Link>
          </Magnetik>
        </div>
      </div>
    </section>
  );
}
