"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, CalculatorIcon, PillIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { JurusanLanding } from "@/server/actions/ambilLanding";

// Warna dan foto per jurusan. Keempat jurusan punya foto; jurusan baru tanpa foto memakai bentuk besar dan ikon.
const TAMPIL: Record<string, { warna: string; kode: string; foto?: { src: string; alt: string; posisi?: string }; ikon?: "kalkulator" | "obat" }> = {
  AKL: {
    warna: "bg-primer text-kertas",
    kode: "text-kunyit",
    foto: { src: "/images/sekolah/praktik-akl.webp", alt: "Siswa AKL mengerjakan uji kompetensi akuntansi di laboratorium komputer" },
  },
  MPLB: {
    warna: "bg-mint text-ink",
    kode: "text-ink",
    foto: { src: "/images/sekolah/praktik-mplb.webp", alt: "Siswi MPLB berlatih layanan telepon di ruang praktik perkantoran" },
  },
  LPK3: {
    warna: "bg-jurusan-lpk3 text-kertas",
    kode: "text-kertas",
    // Foto 4:3 di bingkai hampir kotak: fokus ke siswi kiri yang meracik, dengan rak hijau di kanannya.
    foto: { src: "/images/sekolah/praktik-farmasi.webp", alt: "Siswa LPK3 meracik obat dengan mortir dan alu di laboratorium farmasi", posisi: "object-[0%_50%]" },
  },
  TKR: {
    warna: "bg-jurusan-tkr text-kertas",
    kode: "text-kertas",
    // Foto lebar 2:1 di bingkai hampir kotak: fokus ke guru dan siswa yang memeriksa roda di kiri.
    foto: { src: "/images/sekolah/praktik-tkr.webp", alt: "Siswa TKR memeriksa roda mobil di bengkel sekolah", posisi: "object-[18%_50%]" },
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
        "relative flex w-[min(86vw,48rem)] shrink-0 snap-start flex-col gap-5 overflow-hidden rounded-kartu p-5 sm:p-7 lg:min-h-[min(25rem,58dvh)] lg:w-[min(48rem,58vw)] lg:flex-row lg:gap-6 lg:p-7",
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
        {j.mapelUtama.length > 0 && (
          <p className="mt-2 max-w-[48ch] text-[0.8125rem]">
            <span className="font-bold">Nilai rapor yang paling berpengaruh:</span> {j.mapelUtama.join(", ")}.
          </p>
        )}
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
        {t.foto ? (
          <div data-foto-panel className="absolute inset-[-8%] will-change-transform">
            <Image src={t.foto.src} alt={t.foto.alt} fill sizes="(min-width: 1024px) 30vw, 100vw" className={cn("object-cover", t.foto.posisi)} />
          </div>
        ) : (
          <Bentuk ikon={t.ikon} />
        )}
      </div>
    </article>
  );
}

export function ProgramKeahlian({ jurusan }: { jurusan: JurusanLanding[] }) {
  if (jurusan.length === 0) return null;

  return (
    <section
      id="jurusan"
      aria-labelledby="judul-jurusan"
      className="overflow-hidden bg-latar py-16"
    >
      <div className="wadah w-full">
        <h2
          id="judul-jurusan"
          className="max-w-[18ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[1.15] tracking-[-0.015em] text-ink"
        >
          Empat jalan menuju kerja yang berakhlak.
        </h2>
      </div>

      <div
        data-jalur
        role="region"
        aria-label="Daftar program keahlian"
        tabIndex={0}
        className="sejajar-wadah mt-7 flex w-full snap-x snap-mandatory gap-5 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-4 focus-visible:outline-offset-4 lg:mt-8 lg:gap-6"
      >
        {jurusan.map((j) => (
          <Panel key={j.kode} j={j} />
        ))}
      </div>
    </section>
  );
}
