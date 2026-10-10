"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { Magnetik } from "./magnetik";

// Copy hero: usulan awal, final dari sekolah (keputusan S14).
export function Hero({ tahunAjaran }: { tahunAjaran: string | null }) {
  const akar = useRef<HTMLElement>(null);

  useGsapPublik(akar, {
    animasi: ({ gsap, SplitText, ScrollTrigger, akar: el }) => {
      const judul = el.querySelector<HTMLElement>("[data-judul]");
      const foto = el.querySelector<HTMLElement>("[data-foto-layer]");
      const gambar = el.querySelector<HTMLElement>("[data-foto-gambar]");
      const teks = el.querySelector<HTMLElement>("[data-teks]");

      // Masuk: huruf judul naik dari balik topeng baris, lalu sisanya menyusul.
      const split = judul ? SplitText.create(judul, { aria: "none", type: "lines,chars", mask: "lines", charsClass: "huruf" }) : null;
      const masuk = gsap.timeline({ delay: 0.15 });
      if (split) masuk.from(split.chars, { yPercent: 115, rotate: 6, duration: 0.9, ease: "expo.out", stagger: 0.018 });
      masuk
        .from("[data-masuk]", { opacity: 0, y: 18, duration: 0.6, ease: "power3.out", stagger: 0.08 }, "-=0.55")
        .from(foto, { yPercent: 14, duration: 1.1, ease: "expo.out" }, "-=0.9");

      // Gulir: foto mengembang dari banner menjadi layar penuh, teks terangkat dan memudar.
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top 64px", end: "+=110%", pin: true, scrub: 0.6 },
      });
      tl.to(foto, { clipPath: "inset(0% 0% 0% 0% round 0px)" }, 0)
        .fromTo(gambar, { scale: 1.18 }, { scale: 1 }, 0)
        .to(teks, { yPercent: -18, opacity: 0, duration: 0.38, ease: "power1.in" }, 0);

      return () => {
        split?.revert();
        ScrollTrigger.getAll().forEach((t) => t.trigger === el && t.kill());
      };
    },
  });

  return (
    <section ref={akar} className="relative h-[calc(100dvh-4rem)] min-h-[36rem] overflow-hidden bg-latar">
      {/* Foto sekolah warna asli. Dipotong jadi banner di bawah, mengembang saat digulir. */}
      <div
        data-foto-layer
        className="absolute inset-0 [clip-path:inset(60%_4%_5%_4%_round_14px)] lg:[clip-path:inset(50%_3%_5%_3%_round_14px)]"
      >
        <div data-foto-gambar className="absolute inset-0 will-change-transform">
          <Image
            src="/images/sekolah/gedung-siswa.webp"
            alt="Siswi SMK Ma'arif NU 1 Wangon berfoto bersama di halaman depan gedung sekolah"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[50%_60%]"
          />
        </div>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
      </div>

      <div data-teks className="relative z-10 mx-auto flex h-full max-w-[100rem] flex-col px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8">
        <h1
          data-judul
          className="max-w-[16ch] text-[clamp(2.1rem,5vw,4.5rem)] font-bold leading-[0.97] tracking-[-0.03em] text-ink lg:max-w-none"
        >
          Belajar terampil,
          <br className="hidden sm:block" /> tumbuh berakhlak.
        </h1>

        <div className="mt-4 flex flex-col gap-4 sm:mt-5 lg:mt-6 lg:flex-row lg:items-end lg:justify-between">
          <p data-masuk className="max-w-[38ch] text-base leading-snug text-ink/75 sm:text-lg">
            SMK Pusat Keunggulan di Wangon, Banyumas. Daftar tanpa akun, unggah rapor, dan dapatkan saran jurusan.
          </p>
          <div data-masuk className="flex flex-col gap-3 sm:flex-row">
            <Magnetik className="sm:inline-block">
              <Link href="/daftar/langkah/1" className="block">
                <Button varian="aksen" ukuran="lg" className="w-full sm:w-auto">
                  Daftar Sekarang
                </Button>
              </Link>
            </Magnetik>
            <Magnetik className="sm:inline-block">
              <Link href="/cek-status" className="block">
                <Button varian="gelap" ukuran="lg" className="w-full sm:w-auto">
                  Cek Status
                </Button>
              </Link>
            </Magnetik>
          </div>
        </div>
        {tahunAjaran && (
          <p data-masuk className="angka mt-4 text-sm font-semibold text-ink/60">
            Penerimaan murid baru tahun ajaran {tahunAjaran}
          </p>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-6 right-6 z-10 hidden items-center gap-3 rounded-kartu bg-permukaan/95 px-3 py-2.5 shadow-kartu lg:flex">
        <Image src="/images/sekolah/lambang.png" alt="" width={40} height={40} className="size-10 object-contain" />
        <p className="text-sm font-bold leading-tight text-ink">
          SMK Pusat
          <br />
          Keunggulan
        </p>
      </div>
    </section>
  );
}
