"use client";

import { useRef } from "react";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { GambarKonten } from "@/features/berita/gambar-konten";
import { GALERI_BAWAAN } from "@/lib/aset-bawaan";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";

// Foto asli dari situs sekolah, warna asli. Keterangan di bawah foto, bukan menimpanya.
// Tata letak layar lebar: dua baris berpasangan (7/5 lalu 5/7) bertepi sejajar, lalu satu foto lebar penuh.
// Di tiap baris, foto berasio tetap menentukan tinggi baris; pasangannya (`lg:flex-1`) mengisi tinggi yang sama.
const FOTO = GALERI_BAWAAN;

type FotoDb = { id: string; judul: string | null; gambar: string };

export function KehidupanSekolah({ galeri = [] }: { galeri?: FotoDb[] }) {
  const akar = useRef<HTMLElement>(null);
  const jalur = useRef<HTMLDivElement>(null);
  // Galeri dari admin menggantikan foto bawaan bila minimal tiga foto aktif.
  const daftar =
    galeri.length >= 3
      ? galeri.map((g) => ({
          src: g.gambar,
          alt: g.judul ?? "Foto kegiatan SMK Ma'arif NU 1 Wangon",
          ket: g.judul ?? "",
        }))
      : FOTO;

  function geser(arah: 1 | -1) {
    const el = jalur.current;
    if (!el) return;
    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: arah * el.clientWidth * 0.8, behavior: kurangiGerak ? "auto" : "smooth" });
  }

  // Hanya judul yang beranimasi; foto digeser pengguna lewat swipe atau tombol.
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
          className="max-w-[18ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[0.96] tracking-[-0.015em] text-ink"
        >
          Belajar, berkarya, dan beribadah bersama.
        </h2>

        <div className="mt-10 flex items-center justify-between gap-4 lg:mt-14">
          <p className="text-sm text-tinta-redup">Geser ke samping untuk melihat foto lainnya.</p>
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

        <div
          ref={jalur}
          data-slider-galeri
          role="region"
          aria-label="Galeri foto kegiatan sekolah"
          tabIndex={0}
          className="mt-4 overflow-x-auto overscroll-x-contain pb-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory focus-visible:outline-offset-4 [&::-webkit-scrollbar]:hidden"
        >
        <ul className="flex w-max gap-5">
          {daftar.map((f) => (
            <li key={f.src} className="w-[78vw] shrink-0 snap-start sm:w-[52vw] lg:w-[min(44vw,40rem)]">
              <figure className="flex flex-col gap-3">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-kartu bg-permukaan-alt">
                  <GambarKonten src={f.src} alt={f.alt} sizes="(min-width: 1024px) 44vw, 85vw" />
                </div>
                {f.ket && <figcaption className="text-sm text-tinta-redup">{f.ket}</figcaption>}
              </figure>
            </li>
          ))}
        </ul>
        </div>
      </div>
    </section>
  );
}
