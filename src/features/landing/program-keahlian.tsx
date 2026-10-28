"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRightIcon, CalculatorIcon, PillIcon } from "@phosphor-icons/react";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { GambarKonten } from "@/features/berita/gambar-konten";
import { fotoJurusan } from "@/lib/aset-bawaan";
import { cn } from "@/lib/cn";
import type { JurusanLanding } from "@/server/actions/ambilLanding";

// Warna per jurusan. Foto dari pilihan admin atau foto bawaan (fotoJurusan); jurusan tanpa foto memakai bentuk besar dan ikon.
const TAMPIL: Record<string, { warna: string; kode: string; ikon?: "kalkulator" | "obat" }> = {
  AKL: {
    warna: "bg-primer text-kertas",
    kode: "text-kunyit",
  },
  MPLB: {
    warna: "bg-kunyit text-ink",
    kode: "text-ink",
  },
  LPK3: {
    warna: "bg-jurusan-lpk3 text-kertas",
    kode: "text-kertas",
  },
  TKR: {
    warna: "bg-jurusan-tkr text-kertas",
    kode: "text-kertas",
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
  const foto = fotoJurusan(j.kode, j.nama, j.gambar);
  return (
    <article
      data-panel
      className={cn(
        "relative flex shrink-0 flex-col gap-5 overflow-hidden rounded-kartu p-5 sm:p-7 lg:min-h-[min(25rem,58dvh)] lg:w-[min(48rem,58vw)] lg:flex-row lg:gap-6 lg:p-7",
        t.warna,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <p
          className={cn("font-display text-[clamp(3.5rem,6vw,5rem)] font-bold leading-[0.8] tracking-[-0.03em]", t.kode)}
        >
          {j.kode}
        </p>
        <h3 className="mt-4 max-w-[24ch] text-lg font-bold leading-tight sm:text-xl lg:text-2xl">{j.nama}</h3>
        <p className="mt-2 max-w-[48ch] text-sm lg:text-[0.9375rem]">{j.deskripsi}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {j.prospekKarir.map((k) => (
            <li key={k} className="rounded-full border border-current/40 px-2.5 py-0.5 text-xs font-semibold">
              {k}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 pt-4">
          <p className="angka text-[0.8125rem] font-bold">Daya tampung {j.kuota} murid</p>
          <Link
            href={`/jurusan/${j.kode.toLowerCase()}`}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold underline decoration-2 underline-offset-4"
          >
            Lihat jurusan {j.kode}
            <ArrowRightIcon aria-hidden weight="bold" className="size-4" />
          </Link>
        </div>
      </div>

      <div className="relative min-h-44 flex-1 overflow-hidden rounded-kartu lg:min-h-0 lg:max-w-[38%]">
        {foto ? (
          <div data-foto-panel className="absolute inset-[-8%] will-change-transform">
            <GambarKonten src={foto.src} alt={foto.alt} sizes="(min-width: 1024px) 30vw, 100vw" className={foto.posisi} />
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
      className="overflow-hidden bg-latar pt-6 pb-8 lg:flex lg:h-[calc(100dvh-4rem)] lg:flex-col lg:justify-start lg:pt-6 lg:pb-0"
    >
      <div className="wadah w-full">
        <h2
          id="judul-jurusan"
          className="max-w-[18ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[1.15] tracking-[-0.015em] text-ink"
        >
          Empat jalan menuju kerja yang berakhlak.
        </h2>
      </div>

      <div data-jalur className="sejajar-wadah mt-7 flex flex-col gap-5 lg:mt-8 lg:w-max lg:flex-row lg:gap-6">
        {jurusan.map((j) => (
          <Panel key={j.kode} j={j} />
        ))}
      </div>

      <div aria-hidden className="wadah mt-8 hidden lg:block">
        <div className="h-1 overflow-hidden rounded-full bg-ink/10">
          <div data-progres className="h-full origin-left scale-x-0 bg-ink" />
        </div>
      </div>
    </section>
  );
}
