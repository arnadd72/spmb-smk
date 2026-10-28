"use client";

import { useEffect, useRef } from "react";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { cn } from "@/lib/cn";
import { GambarKonten } from "@/features/berita/gambar-konten";
import { GALERI_BAWAAN } from "@/lib/aset-bawaan";
import { batalkanGulir, gulirHalus } from "@/lib/gulir-halus";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";

// Foto asli dari situs sekolah, warna asli. Keterangan di bawah foto, bukan menimpanya.
// Tata letak layar lebar: dua baris berpasangan (7/5 lalu 5/7) bertepi sejajar, lalu satu foto lebar penuh.
// Di tiap baris, foto berasio tetap menentukan tinggi baris; pasangannya (`lg:flex-1`) mengisi tinggi yang sama.
const FOTO = GALERI_BAWAAN;

/** Jeda singkat sebelum geser pertama setelah galeri terlihat. */
const TUNDA_AWAL_MS = 700;
/** Selang geser otomatis, dan jeda setelah pengguna menyentuh atau menggeser sendiri. */
const SELANG_OTOMATIS_MS = 2500;
const JEDA_SETELAH_INTERAKSI_MS = 4000;

type FotoDb = { id: string; judul: string | null; gambar: string };

export function KehidupanSekolah({ galeri = [] }: { galeri?: FotoDb[] }) {
  const akar = useRef<HTMLElement>(null);
  const jalur = useRef<HTMLDivElement>(null);
  // Foto dari admin MENAMBAH foto bawaan (bawaan dulu, lalu foto admin). Bila admin memuat foto bawaan ke galeri
  // (sudah ada di database), isi galeri menjadi acuan tunggal agar foto bawaan bisa diurutkan atau dihapus.
  const dariAdmin = galeri.map((g) => ({
    src: g.gambar,
    alt: g.judul ?? "Foto kegiatan SMK Ma'arif NU 1 Wangon",
    ket: g.judul ?? "",
  }));
  const srcBawaan = new Set(FOTO.map((f) => f.src));
  const bawaanDimuat = galeri.some((g) => srcBawaan.has(g.gambar));
  const daftar = bawaanDimuat ? dariAdmin : [...FOTO, ...dariAdmin];
  // Satu foto saja: tampil diam, tanpa putaran, geser otomatis, dan tombol panah.
  const putar = daftar.length >= 2;

  function geser(arah: 1 | -1) {
    const el = jalur.current;
    if (!el) return;
    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Loncat tepat ke awal foto sebelumnya atau berikutnya (bukan jarak piksel), supaya tidak ditarik balik oleh scroll-snap.
    const li = Array.from(el.querySelectorAll<HTMLElement>("li"));
    const awal = li.map((x) => x.offsetLeft - li[0].offsetLeft);
    const tujuan = arah === 1 ? awal.find((x) => x > el.scrollLeft + 8) : awal.findLast((x) => x < el.scrollLeft - 8);
    if (tujuan !== undefined) gulirHalus(el, tujuan, kurangiGerak);
  }

  // Putaran tanpa ujung: daftar dirender tiga kali (A, B, C). Posisi dijaga di salinan tengah (B); begitu
  // gerakan berhenti, posisi dipindah diam-diam sejauh satu set sehingga geser ke arah mana pun tidak pernah mentok.
  // Geser otomatis berhenti saat pengguna berinteraksi, saat galeri di luar layar, saat tab tersembunyi,
  // dan tidak berjalan bila pengguna memilih kurangi gerak.
  useEffect(() => {
    const el = jalur.current;
    if (!el || !putar) return;
    const n = daftar.length;
    const item = () => Array.from(el.querySelectorAll<HTMLElement>("li"));
    const posisi = (li: HTMLElement) => li.offsetLeft - item()[0].offsetLeft;
    const lebarSet = () => {
      const semua = item();
      return semua.length > n ? posisi(semua[n]) : 0;
    };

    el.scrollLeft = lebarSet();
    let diam: number | undefined;
    const rapikan = () => {
      const w = lebarSet();
      if (!w) return;
      if (el.scrollLeft < w) el.scrollLeft += w;
      else if (el.scrollLeft >= 2 * w) el.scrollLeft -= w;
    };
    const saatGulir = () => {
      window.clearTimeout(diam);
      diam = window.setTimeout(rapikan, 150);
    };
    el.addEventListener("scroll", saatGulir, { passive: true });

    // Pengguna "kurangi gerak" tetap mendapat geser otomatis, tetapi berpindah tanpa animasi halus.
    // Hanya sentuhan, roda, dan papan ketik yang menjeda sementara; kursor diam di galeri tidak menghentikannya.
    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)");
    let terakhirInteraksi = 0;
    let terlihat = false;
    let timer: number | undefined;
    let tundaAwal: number | undefined;
    const tandai = () => {
      terakhirInteraksi = Date.now();
    };
    // Sentuhan atau roda mengambil alih dari animasi yang sedang berjalan.
    const ambilAlih = () => {
      tandai();
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
    const area = el.closest("section") ?? el;
    const peristiwa: [string, () => void][] = [
      ["pointerdown", ambilAlih],
      ["wheel", ambilAlih],
      ["keydown", tandai],
    ];
    for (const [nama, fn] of peristiwa) area.addEventListener(nama, fn, { passive: true });

    const langkahOtomatis = () => {
      if (!terlihat || document.hidden) return;
      if (Date.now() - terakhirInteraksi < JEDA_SETELAH_INTERAKSI_MS) return;
      const berikut = item().find((li) => posisi(li) > el.scrollLeft + 8);
      if (berikut) gulirHalus(el, posisi(berikut), kurangiGerak.matches);
    };
    timer = window.setInterval(langkahOtomatis, SELANG_OTOMATIS_MS);

    return () => {
      window.clearTimeout(diam);
      window.clearInterval(timer);
      batalkanGulir(el);
      pengamat.disconnect();
      el.removeEventListener("scroll", saatGulir);
      for (const [nama, fn] of peristiwa) area.removeEventListener(nama, fn);
    };
  }, [daftar.length, putar]);

  // Hanya judul yang beranimasi; foto bergeser otomatis, dan bisa digeser pengguna lewat swipe atau tombol.
  useGsapPublik(akar, {
    animasi: ({ gsap, SplitText, akar: el }) => {
      const judul = el.querySelector<HTMLElement>("[data-judul-hidup]");
      const split = judul ? SplitText.create(judul, { aria: "none", type: "words", mask: "words", wordsClass: "kata" }) : null;
      if (split) {
        gsap.from(split.words, {
          yPercent: 110,
          duration: 0.8,
          ease: "expo.out",
          stagger: 0.05,
          scrollTrigger: { trigger: judul, start: "top 85%", once: true },
        });
      }


      return () => split?.revert();
    },
  });

  return (
    <section ref={akar} id="kehidupan-sekolah" aria-labelledby="judul-kehidupan" className="bg-permukaan py-16 lg:py-24">
      <div className="wadah ">
        <h2
          id="judul-kehidupan"
          data-judul-hidup
          className="max-w-[18ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[1.12] tracking-[-0.015em] text-ink lg:leading-[0.96]"
        >
          Belajar, berkarya, dan beribadah bersama.
        </h2>

        {putar && (
        <div className="mt-10 flex items-center justify-between gap-4 lg:mt-14">
          <p className="text-sm text-tinta-redup">Foto bergeser otomatis. Geser ke samping untuk melihat foto lainnya.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => geser(-1)}
              aria-label="Foto sebelumnya"
              className="grid size-11 place-items-center rounded-full border border-garis bg-latar text-ink hover:bg-permukaan-alt"
            >
              <ArrowLeftIcon aria-hidden weight="bold" className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => geser(1)}
              aria-label="Foto berikutnya"
              className="grid size-11 place-items-center rounded-full border border-garis bg-latar text-ink hover:bg-permukaan-alt"
            >
              <ArrowRightIcon aria-hidden weight="bold" className="size-5" />
            </button>
          </div>
        </div>
        )}

        <div
          ref={jalur}
          data-slider-galeri
          role="region"
          aria-label="Galeri foto kegiatan sekolah"
          tabIndex={0}
          className={cn(putar ? "mt-4" : "mt-10 lg:mt-14", "overflow-x-auto overscroll-x-contain pb-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory focus-visible:outline-offset-4 [&::-webkit-scrollbar]:hidden")}
        >
        <ul className="flex w-max gap-5">
          {(putar ? [0, 1, 2] : [0]).flatMap((salinan) =>
            daftar.map((f) => (
              <li
                key={`${salinan}-${f.src}`}
                aria-hidden={salinan === (putar ? 1 : 0) ? undefined : true}
                className="w-[78vw] shrink-0 snap-start sm:w-[52vw] lg:w-[min(44vw,40rem)]"
              >
                <figure className="flex flex-col gap-3">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-kartu bg-permukaan-alt">
                    <GambarKonten src={f.src} alt={f.alt} sizes="(min-width: 1024px) 44vw, 85vw" />
                  </div>
                  {f.ket && <figcaption className="text-sm text-tinta-redup">{f.ket}</figcaption>}
                </figure>
              </li>
            )),
          )}
        </ul>
        </div>
      </div>
    </section>
  );
}
