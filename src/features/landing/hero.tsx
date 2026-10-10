"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { Magnetik } from "./magnetik";

// Copy hero: usulan awal, final dari sekolah (keputusan S14).
export function Hero({ tahunAjaran }: { tahunAjaran: string | null }) {
  const akar = useRef<HTMLElement>(null);

  // Foto dimulai tepat di bawah blok teks (jarak tetap), berapa pun tinggi layar dan panjang judul.
  // Diukur lewat ResizeObserver dan ditulis ke variabel CSS, tanpa state React.
  useEffect(() => {
    const el = akar.current;
    const blok = el?.querySelector<HTMLElement>("[data-teks]");
    if (!el || !blok) return;
    const ukur = () => {
      const bawah = Math.max(...Array.from(blok.children).map((c) => (c as HTMLElement).offsetTop + (c as HTMLElement).offsetHeight));
      el.style.setProperty("--teks", `${bawah}px`);
    };
    ukur();
    const ro = new ResizeObserver(ukur);
    ro.observe(blok);
    Array.from(blok.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, []);

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

      // Nilai awal clip-path ditulis eksplisit 4 sisi (px). Jangan mengandalkan nilai computed CSS: browser
      // menyederhanakan inset(a b c b) menjadi 3 nilai sehingga GSAP salah menginterpolasi kiri dan kanan.
      const awal = () => {
        const besar = window.innerWidth >= 1024;
        const atas = parseFloat(el.style.getPropertyValue("--teks") || "0") + (besar ? 40 : 32);
        const blok = el.querySelector<HTMLElement>("[data-teks]");
        const samping = blok ? blok.getBoundingClientRect().left + parseFloat(getComputedStyle(blok).paddingLeft) : 20;
        return `inset(${atas}px ${samping}px ${besar ? 40 : 24}px ${samping}px round ${besar ? 22 : 18}px)`;
      };

      // Akhir gulir: foto membesar ke tengah area layar tetapi tetap memakai margin samping yang sama
      // dengan teks (tidak sampai tepi layar). Atas dan bawah sama besar supaya tepat di tengah.
      const akhir = () => {
        const besar = window.innerWidth >= 1024;
        const blok = el.querySelector<HTMLElement>("[data-teks]");
        const samping = blok ? blok.getBoundingClientRect().left + parseFloat(getComputedStyle(blok).paddingLeft) : 20;
        const tepi = besar ? 28 : 16;
        return `inset(${tepi}px ${samping}px ${tepi}px ${samping}px round ${besar ? 22 : 18}px)`;
      };

      // Gulir: foto mengembang dari banner ke tengah layar, teks terangkat dan memudar.
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top 64px", end: "+=110%", pin: true, scrub: 0.6, invalidateOnRefresh: true },
      });
      tl.fromTo(foto, { clipPath: awal }, { clipPath: akhir, duration: 1 }, 0)
        .fromTo(gambar, { scale: 1.18 }, { scale: 1, duration: 1 }, 0)
        .to(teks, { yPercent: -14, opacity: 0, duration: 0.2, ease: "power1.in" }, 0);

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
        className="absolute inset-0 [--m:max(var(--pad),calc((100vw-84rem)/2+var(--pad)))] [clip-path:inset(calc(var(--teks,20rem)+2rem)_var(--m)_1.5rem_var(--m)_round_18px)] lg:[clip-path:inset(calc(var(--teks,20rem)+2.5rem)_var(--m)_2.5rem_var(--m)_round_22px)]"
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

      <div data-teks className="wadah relative z-10 flex h-full flex-col pt-8 lg:pt-12">
        <h1
          data-judul
          className="max-w-[16ch] text-[clamp(2rem,4.4vw,3.9rem)] font-semibold leading-[1] tracking-[-0.02em] text-ink lg:max-w-none"
        >
          Belajar terampil,
          <br className="hidden sm:block" /> tumbuh berakhlak.
        </h1>

        <div className="mt-5 flex flex-col gap-5 sm:mt-6 lg:mt-8 lg:flex-row lg:items-end lg:justify-between">
          <p data-masuk className="max-w-[40ch] text-base leading-relaxed text-ink/75 sm:text-lg">
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

      <div className="pointer-events-none absolute bottom-[3.25rem] right-[calc(max(var(--pad),calc((100vw-84rem)/2+var(--pad)))+1rem)] z-10 hidden items-center gap-3 rounded-kartu bg-permukaan/95 px-3 py-2.5 shadow-kartu lg:flex">
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
