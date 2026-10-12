"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { Magnetik } from "./magnetik";

export function Penutup() {
  const akar = useRef<HTMLElement>(null);

  useGsapPublik(akar, {
    animasi: ({ gsap, SplitText, akar: el }) => {
      const judul = el.querySelector<HTMLElement>("[data-judul-penutup]");
      const split = judul ? SplitText.create(judul, { aria: "none", type: "lines,chars", mask: "lines", linesClass: "baris" }) : null;
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
      // Lambang besar berputar pelan mengikuti gulir, hanya sebagai latar.
      gsap.to("[data-lambang-latar]", { rotate: 90, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
      return () => split?.revert();
    },
  });

  return (
    <section ref={akar} aria-labelledby="judul-penutup" className="relative overflow-hidden bg-ink py-20 text-kertas lg:py-28">
      <Image
        data-lambang-latar
        src="/images/sekolah/logo-sekolah.png"
        alt=""
        width={800}
        height={800}
        aria-hidden
        className="pointer-events-none absolute -right-40 top-1/2 size-[34rem] -translate-y-1/2 object-contain opacity-[0.09]"
      />
      <div className="wadah relative">
        <h2
          id="judul-penutup"
          data-judul-penutup
          className="max-w-[14ch] text-[clamp(2.1rem,5.4vw,4.75rem)] font-bold leading-[0.92] tracking-[-0.02em]"
        >
          Siapkan rapor dan akta, <span className="text-kuning">mulai</span> hari ini.
        </h2>
        <p data-aksi className="mt-6 max-w-[46ch] text-base text-kertas/80 lg:text-lg">
          Sudah mendaftar? Masukkan nomor pendaftaran dan tanggal lahir untuk melihat status verifikasi.
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
            <Link data-aksi href="/cek-status" className="block">
              <Button varian="terang" ukuran="lg" className="w-full sm:w-auto">
                Cek Status
              </Button>
            </Link>
          </Magnetik>
        </div>
      </div>
    </section>
  );
}
