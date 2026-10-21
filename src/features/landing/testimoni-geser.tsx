"use client";

import { useEffect, useRef, useState } from "react";
import { GambarKonten } from "@/features/berita/gambar-konten";
import { batalkanGulir, gulirHalus } from "@/lib/gulir-halus";
import { cn } from "@/lib/cn";

type Testimoni = { id: string; nama: string; keterangan: string | null; isi: string; foto: string | null };

/** Testimoni lebih lama dibaca daripada foto: selang geser lebih panjang dari galeri. */
const SELANG_OTOMATIS_MS = 4000;
const JEDA_SETELAH_INTERAKSI_MS = 5000;

/**
 * Satu baris testimoni yang bergeser otomatis dan berputar tanpa ujung (tiga salinan, posisi dirapikan diam-diam
 * ke salinan tengah, sama seperti galeri foto). Tanpa tombol panah: titik di bawah kartu menandai testimoni
 * aktif, dan mengkliknya langsung membawa ke testimoni itu.
 */
export function TestimoniGeser({ testimoni }: { testimoni: Testimoni[] }) {
  const jalur = useRef<HTMLDivElement>(null);
  const [aktif, setAktif] = useState(0);
  const n = testimoni.length;
  const banyak = n > 1;

  useEffect(() => {
    const el = jalur.current;
    if (!el || !banyak) return;
    const item = () => Array.from(el.querySelectorAll<HTMLElement>("li"));
    const posisi = (li: HTMLElement) => li.offsetLeft - item()[0].offsetLeft;
    const lebarSet = () => {
      const semua = item();
      return semua.length > n ? posisi(semua[n]) : 0;
    };
    const langkah = () => {
      const semua = item();
      return semua.length > 1 ? posisi(semua[1]) : 0;
    };

    el.scrollLeft = lebarSet();
    let diam: number | undefined;
    const rapikan = () => {
      const w = lebarSet();
      if (!w) return;
      if (el.scrollLeft < w) el.scrollLeft += w;
      else if (el.scrollLeft >= 2 * w) el.scrollLeft -= w;
    };
    let bingkai = 0;
    const saatGulir = () => {
      window.clearTimeout(diam);
      diam = window.setTimeout(rapikan, 150);
      cancelAnimationFrame(bingkai);
      bingkai = requestAnimationFrame(() => {
        const l = langkah();
        if (l) setAktif(((Math.round(el.scrollLeft / l) % n) + n) % n);
      });
    };
    el.addEventListener("scroll", saatGulir, { passive: true });
    saatGulir();

    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)");
    let terakhirInteraksi = 0;
    let terlihat = false;
    const ambilAlih = () => {
      terakhirInteraksi = Date.now();
      batalkanGulir(el);
    };
    const pengamat = new IntersectionObserver(([e]) => {
      terlihat = e.isIntersecting;
    });
    pengamat.observe(el);
    const peristiwa: [string, () => void][] = [
      ["pointerdown", ambilAlih],
      ["wheel", ambilAlih],
      ["keydown", ambilAlih],
    ];
    for (const [nama, fn] of peristiwa) el.addEventListener(nama, fn, { passive: true });

    const timer = window.setInterval(() => {
      if (!terlihat || document.hidden) return;
      if (Date.now() - terakhirInteraksi < JEDA_SETELAH_INTERAKSI_MS) return;
      const berikut = item().find((li) => posisi(li) > el.scrollLeft + 8);
      if (berikut) gulirHalus(el, posisi(berikut), kurangiGerak.matches);
    }, SELANG_OTOMATIS_MS);

    return () => {
      window.clearTimeout(diam);
      window.clearInterval(timer);
      cancelAnimationFrame(bingkai);
      batalkanGulir(el);
      pengamat.disconnect();
      el.removeEventListener("scroll", saatGulir);
      for (const [nama, fn] of peristiwa) el.removeEventListener(nama, fn);
    };
  }, [n, banyak]);

  /** Ke salinan testimoni ke-`i` yang terdekat dari posisi sekarang, supaya gerakannya pendek. */
  function keTestimoni(i: number) {
    const el = jalur.current;
    if (!el) return;
    const li = Array.from(el.querySelectorAll<HTMLElement>("li"));
    const awal = li[0].offsetLeft;
    const kandidat = [i, i + n, i + 2 * n].map((k) => li[k].offsetLeft - awal);
    const tujuan = kandidat.reduce((a, b) => (Math.abs(b - el.scrollLeft) < Math.abs(a - el.scrollLeft) ? b : a));
    gulirHalus(el, tujuan, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  return (
    <div className="mt-10">
      <div
        ref={jalur}
        data-slider-testimoni
        role="region"
        aria-roledescription="carousel"
        aria-label="Testimoni"
        tabIndex={banyak ? 0 : undefined}
        className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory focus-visible:outline-offset-4 [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex w-full gap-5">
          {(banyak ? [0, 1, 2] : [0]).flatMap((salinan) =>
            testimoni.map((t) => (
              <li
                key={`${salinan}-${t.id}`}
                aria-hidden={salinan === (banyak ? 1 : 0) ? undefined : true}
                className="w-full shrink-0 snap-start"
              >
                <figure className="flex h-full flex-col justify-between gap-6 rounded-kartu bg-latar p-6 lg:p-8">
                  <blockquote className="text-lg font-medium leading-relaxed text-ink lg:text-xl">&ldquo;{t.isi}&rdquo;</blockquote>
                  <figcaption className="flex items-center gap-3">
                    {t.foto ? (
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-permukaan-alt">
                        <GambarKonten src={t.foto} alt="" sizes="48px" />
                      </span>
                    ) : (
                      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-primer font-display text-lg font-bold text-primer-tinta">
                        {t.nama.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span>
                      <span className="block font-bold text-ink">{t.nama}</span>
                      {t.keterangan && <span className="block text-sm text-tinta-redup">{t.keterangan}</span>}
                    </span>
                  </figcaption>
                </figure>
              </li>
            )),
          )}
        </ul>
      </div>

      {banyak && (
        <div role="group" aria-label="Pilih testimoni" className="mt-3 flex flex-wrap justify-center">
          {testimoni.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => keTestimoni(i)}
              aria-label={`Testimoni ${i + 1} dari ${n}: ${t.nama}`}
              aria-current={i === aktif ? "true" : undefined}
              data-titik-testimoni={i}
              className="group grid size-11 place-items-center"
            >
              <span
                aria-hidden
                className={cn(
                  "h-2.5 rounded-full transition-all duration-300",
                  i === aktif ? "w-7 bg-primer" : "w-2.5 bg-garis group-hover:bg-tinta-redup",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
