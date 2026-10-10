"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowRightIcon, CalculatorIcon, PillIcon } from "@phosphor-icons/react";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { cn } from "@/lib/cn";
import type { JurusanLanding } from "@/server/actions/ambilLanding";

// Warna dan foto per jurusan. Foto tersedia untuk MPLB dan TKR; AKL dan FKK memakai bentuk besar
// sampai sekolah menyediakan foto.
const TAMPIL: Record<string, { warna: string; kode: string; foto?: { src: string; alt: string }; ikon?: "kalkulator" | "obat" }> = {
  AKL: { warna: "bg-kuning text-ink", kode: "text-ink", ikon: "kalkulator" },
  MPLB: {
    warna: "bg-mint text-ink",
    kode: "text-ink",
    foto: { src: "/images/sekolah/praktik-mplb.webp", alt: "Siswi MPLB berlatih layanan telepon di ruang praktik perkantoran" },
  },
  FKK: { warna: "bg-primer text-kertas", kode: "text-kertas", ikon: "obat" },
  TKR: {
    warna: "bg-ink text-kertas",
    kode: "text-kuning",
    foto: { src: "/images/sekolah/praktik-tkr.webp", alt: "Siswa TKR memeriksa roda mobil di bengkel sekolah" },
  },
};

function Bentuk({ ikon }: { ikon?: "kalkulator" | "obat" }) {
  const Ikon = ikon === "obat" ? PillIcon : CalculatorIcon;
  return (
    <div className="relative grid size-full place-items-center overflow-hidden rounded-kartu bg-ink/10">
      <div aria-hidden data-bentuk className="absolute -right-10 -top-10 size-56 rounded-full bg-ink/10 lg:size-72" />
      <div aria-hidden data-bentuk className="absolute -bottom-12 -left-8 size-44 rounded-full border-[14px] border-ink/10 lg:size-60" />
      <Ikon aria-hidden weight="duotone" className="relative size-20 lg:size-28" />
    </div>
  );
}

function Panel({ j }: { j: JurusanLanding }) {
  const t = TAMPIL[j.kode] ?? { warna: "bg-permukaan text-ink", kode: "text-primer" };
  return (
    <article
      data-panel
      className={cn(
        "relative flex shrink-0 flex-col gap-6 overflow-hidden rounded-kartu p-6 sm:p-8 lg:h-[min(32rem,68dvh)] lg:w-[min(60rem,72vw)] lg:flex-row lg:gap-8 lg:p-9",
        t.warna,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <p
          className={cn("font-display text-[clamp(4rem,8.5vw,7.5rem)] font-bold leading-[0.8] tracking-[-0.03em]", t.kode)}
        >
          {j.kode}
        </p>
        <h3 className="mt-5 max-w-[22ch] text-xl font-bold leading-tight sm:text-2xl lg:text-3xl">{j.nama}</h3>
        <p className="mt-3 max-w-[48ch]">{j.deskripsi}</p>
        {j.mapelUtama.length > 0 && (
          <p className="mt-3 max-w-[48ch] text-sm">
            <span className="font-bold">Nilai rapor yang paling berpengaruh:</span> {j.mapelUtama.join(", ")}.
          </p>
        )}
        <ul className="mt-4 flex flex-wrap gap-2">
          {j.prospekKarir.map((k) => (
            <li key={k} className="rounded-full border border-current/40 px-3 py-1 text-sm font-semibold">
              {k}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 pt-6">
          <p className="angka text-sm font-bold">Daya tampung {j.kuota} murid</p>
          <Link
            href={`/jurusan/${j.kode.toLowerCase()}`}
            className="inline-flex min-h-11 items-center gap-2 font-bold underline decoration-2 underline-offset-4"
          >
            Lihat jurusan {j.kode}
            <ArrowRightIcon aria-hidden weight="bold" className="size-4" />
          </Link>
        </div>
      </div>

      <div className="relative min-h-52 flex-1 overflow-hidden rounded-kartu lg:min-h-0 lg:max-w-[42%]">
        {t.foto ? (
          <div data-foto-panel className="absolute inset-[-8%] will-change-transform">
            <Image src={t.foto.src} alt={t.foto.alt} fill sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover" />
          </div>
        ) : (
          <Bentuk ikon={t.ikon} />
        )}
      </div>
    </article>
  );
}

export function ProgramKeahlian({ jurusan }: { jurusan: JurusanLanding[] }) {
  const akar = useRef<HTMLElement>(null);

  // Desktop: bagian ini di-pin dan gulir vertikal menggeser panel ke samping. Di bawah 1024 px atau
  // dengan reduced motion, panel tersusun vertikal biasa.
  useGsapPublik(akar, {
    minLebar: 1024,
    animasi: ({ gsap, akar: el }) => {
      const jalur = el.querySelector<HTMLElement>("[data-jalur]");
      const bar = el.querySelector<HTMLElement>("[data-progres]");
      if (!jalur) return;

      const jarak = () => Math.max(0, jalur.scrollWidth - window.innerWidth);
      gsap.to(jalur, {
        x: () => -jarak(),
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top 64px",
          end: () => `+=${jarak()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });

      // Jangan meneruskan `geser.scrollTrigger` ke tween lain: GSAP menyalinnya termasuk `pin: true`,
      // sehingga elemen yang sama di-pin dua kali dan terlempar keluar layar.
      const rentang = { trigger: el, start: "top 64px", end: () => `+=${jarak()}`, scrub: true, invalidateOnRefresh: true };
      if (bar) gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: rentang });

      // Foto dan bentuk di tiap panel bergerak sedikit berlawanan arah (kedalaman).
      el.querySelectorAll<HTMLElement>("[data-foto-panel]").forEach((f) => {
        gsap.fromTo(f, { xPercent: -5 }, { xPercent: 5, ease: "none", scrollTrigger: { trigger: el, start: "top 64px", end: () => `+=${jarak()}`, scrub: true } });
      });
      el.querySelectorAll<HTMLElement>("[data-bentuk]").forEach((b, i) => {
        gsap.to(b, { rotate: i % 2 ? -25 : 25, ease: "none", scrollTrigger: { trigger: el, start: "top 64px", end: () => `+=${jarak()}`, scrub: true } });
      });
    },
  });

  if (jurusan.length === 0) return null;

  return (
    <section
      ref={akar}
      id="jurusan"
      aria-labelledby="judul-jurusan"
      className="overflow-hidden bg-latar py-16 lg:flex lg:h-[calc(100dvh-4rem)] lg:flex-col lg:justify-center lg:py-0"
    >
      <div className="mx-auto w-full max-w-[100rem] px-4 sm:px-6 lg:px-10">
        <h2
          id="judul-jurusan"
          className="max-w-[18ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[0.98] tracking-[-0.015em] text-ink"
        >
          Empat jalan menuju kerja yang berakhlak.
        </h2>
      </div>

      <div data-jalur className="mt-8 flex flex-col gap-5 px-4 sm:px-6 lg:mt-10 lg:w-max lg:flex-row lg:gap-8 lg:px-10">
        {jurusan.map((j) => (
          <Panel key={j.kode} j={j} />
        ))}
      </div>

      <div aria-hidden className="mx-4 mt-8 hidden h-1 overflow-hidden rounded-full bg-ink/10 sm:mx-6 lg:mx-10 lg:block">
        <div data-progres className="h-full origin-left scale-x-0 bg-ink" />
      </div>
    </section>
  );
}
