"use client";

import { useEffect, useRef, useState } from "react";
import { GambarKonten } from "@/features/berita/gambar-konten";
import { batalkanGulir, gulirHalus } from "@/lib/gulir-halus";
import { cn } from "@/lib/cn";

type Testimoni = { id: string; nama: string; keterangan: string | null; isi: string; foto: string | null };

/** Jeda singkat sebelum geser pertama setelah testimoni terlihat. */
const TUNDA_AWAL_MS = 700;
/** Testimoni lebih lama dibaca daripada foto: selang geser lebih panjang dari galeri. */
const SELANG_OTOMATIS_MS = 4000;
const JEDA_SETELAH_INTERAKSI_MS = 5000;

/** Kutipan yang dipotong 5 baris; tombol "Baca selengkapnya" hanya muncul bila teksnya memang terpotong. */
function Kutipan({ isi, terbuka, onUbah, besar }: { isi: string; terbuka: boolean; onUbah: () => void; besar: boolean }) {
  const ref = useRef<HTMLQuoteElement>(null);
  const [terpotong, setTerpotong] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cek = () => setTerpotong(terbuka || el.scrollHeight > el.clientHeight + 1);
    cek();
    const ro = new ResizeObserver(cek);
    ro.observe(el);
    return () => ro.disconnect();
  }, [terbuka]);

  return (
    <div>
      <blockquote
        ref={ref}
        className={cn("font-medium leading-relaxed text-ink", besar ? "text-lg lg:text-xl" : "text-lg", !terbuka && "line-clamp-5")}
      >
        &ldquo;{isi}&rdquo;
      </blockquote>
      {terpotong && (
        <button
          type="button"
          onClick={onUbah}
          aria-expanded={terbuka}
          data-baca-testimoni
          className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primer-tua underline underline-offset-4 hover:text-primer"
        >
          {terbuka ? "Tutup" : "Baca selengkapnya"}
        </button>
      )}
    </div>
  );
}

/** Lebar kartu per jumlah testimoni: sedikit testimoni = kartu lebih lebar, banyak = sampai 3 kolom di desktop. */
function lebarKartu(n: number) {
  if (n === 1) return "w-full";
  if (n === 2) return "w-full md:w-[calc((100%-1.25rem)/2)]";
  return "w-full md:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-2.5rem)/3)]";
}

/**
 * Baris testimoni. Kolom menyesuaikan jumlah testimoni (HP 1, tablet sampai 2, desktop sampai 3). Bila semuanya
 * muat di layar, kartu diam tanpa titik. Bila lebih banyak, baris bergeser otomatis dan berputar tanpa ujung (tiga
 * salinan, posisi dirapikan diam-diam ke salinan tengah, sama seperti galeri foto); titik di bawah kartu menandai
 * testimoni aktif dan mengkliknya membawa ke testimoni itu. Teks panjang dipotong dengan "Baca selengkapnya".
 */
export function TestimoniGeser({ testimoni }: { testimoni: Testimoni[] }) {
  const jalur = useRef<HTMLDivElement>(null);
  const [aktif, setAktif] = useState(0);
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const terbukaRef = useRef<string | null>(null);
  /** Waktu interaksi terakhir (geser, sentuh, atau klik titik): geser otomatis menunggu sebentar setelahnya. */
  const interaksiRef = useRef(0);
  useEffect(() => {
    terbukaRef.current = terbuka;
  }, [terbuka]);
  const n = testimoni.length;

  // Kolom yang muat di layar sekarang (sama dengan breakpoint lebarKartu). Awal 1 agar sama dengan render server.
  const [kolom, setKolom] = useState(1);
  useEffect(() => {
    const md = window.matchMedia("(min-width: 768px)");
    const lg = window.matchMedia("(min-width: 1024px)");
    const hitung = () => setKolom(lg.matches ? 3 : md.matches ? 2 : 1);
    hitung();
    md.addEventListener("change", hitung);
    lg.addEventListener("change", hitung);
    return () => {
      md.removeEventListener("change", hitung);
      lg.removeEventListener("change", hitung);
    };
  }, []);
  const banyak = n > Math.min(n, kolom);

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
    let terlihat = false;
    let timer: number | undefined;
    let tundaAwal: number | undefined;
    const ambilAlih = () => {
      interaksiRef.current = performance.now();
      batalkanGulir(el);
    };
    const pengamat = new IntersectionObserver(([e]) => {
      const sebelumnya = terlihat;
      terlihat = e.isIntersecting;
      // Begitu galeri masuk layar, geser pertama langsung jalan sebentar kemudian (tidak menunggu detak pewaktu).
      if (terlihat && !sebelumnya) {
        window.clearInterval(timer);
      window.clearTimeout(tundaAwal);
        window.clearTimeout(tundaAwal);
        tundaAwal = window.setTimeout(langkahOtomatis, TUNDA_AWAL_MS);
        timer = window.setInterval(langkahOtomatis, SELANG_OTOMATIS_MS);
      }
    });
    pengamat.observe(el);
    const peristiwa: [string, () => void][] = [
      ["pointerdown", ambilAlih],
      ["wheel", ambilAlih],
      ["keydown", ambilAlih],
    ];
    for (const [nama, fn] of peristiwa) el.addEventListener(nama, fn, { passive: true });

    const langkahOtomatis = () => {
      // Berhenti selama pengunjung membaca testimoni yang dibuka penuh.
      if (!terlihat || document.hidden || terbukaRef.current) return;
      if (performance.now() - interaksiRef.current < JEDA_SETELAH_INTERAKSI_MS) return;
      const berikut = item().find((li) => posisi(li) > el.scrollLeft + 8);
      if (berikut) gulirHalus(el, posisi(berikut), kurangiGerak.matches);
    };
    timer = window.setInterval(langkahOtomatis, SELANG_OTOMATIS_MS);

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

  /** Ke salinan testimoni ke-`i` yang terdekat dari posisi sekarang, supaya gerakannya pendek. `waktu` = e.timeStamp klik. */
  function keTestimoni(i: number, waktu: number) {
    const el = jalur.current;
    if (!el) return;
    // Titik berada di luar jalur: tanpa ini geser otomatis bisa langsung memindahkan lagi testimoni yang dipilih.
    interaksiRef.current = waktu;
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
        {/* Satu testimoni: kartu di tengah dengan lebar baca yang nyaman, tidak membentang selebar layar. */}
        <ul className={cn("flex w-full gap-5", n === 1 && "mx-auto max-w-3xl")}>
          {(banyak ? [0, 1, 2] : [0]).flatMap((salinan) =>
            testimoni.map((t) => (
              <li
                key={`${salinan}-${t.id}`}
                aria-hidden={salinan === (banyak ? 1 : 0) ? undefined : true}
                inert={salinan !== (banyak ? 1 : 0)}
                className={cn("shrink-0 snap-start", lebarKartu(n))}
              >
                <figure className="flex h-full flex-col justify-between gap-6 rounded-kartu bg-latar p-6 lg:p-8">
                  <Kutipan isi={t.isi} besar={n <= 2} terbuka={terbuka === t.id} onUbah={() => setTerbuka((x) => (x === t.id ? null : t.id))} />
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
              onClick={(e) => keTestimoni(i, e.timeStamp)}
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
