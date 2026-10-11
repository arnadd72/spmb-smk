"use client";

import { useRef } from "react";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { GambarKonten } from "@/features/berita/gambar-konten";
import { cn } from "@/lib/cn";

// Foto asli dari situs sekolah, warna asli. Keterangan di bawah foto, bukan menimpanya.
const FOTO = [
  {
    src: "/images/sekolah/p5-karya.webp",
    alt: "Siswa dan guru menunjukkan tempat sampah hasil karya kelas di halaman sekolah",
    ket: "Gelar karya: tempat sampah daur ulang buatan siswa kelas XI.",
    kelas: "lg:col-span-6",
    rasio: "aspect-[16/10]",
  },
  {
    src: "/images/sekolah/istighotsah.webp",
    alt: "Siswa berkumpul untuk istighotsah di aula sekolah",
    ket: "Istighotsah bersama sebelum kunjungan industri.",
    kelas: "lg:col-span-4 lg:col-start-8 lg:mt-12",
    rasio: "aspect-[4/5]",
  },
  {
    src: "/images/sekolah/p5-kostum.webp",
    alt: "Siswi memakai kostum dari bahan daur ulang pada Projek Penguatan Profil Pelajar Pancasila",
    ket: "Pawai karya Projek Penguatan Profil Pelajar Pancasila.",
    kelas: "lg:col-span-4 lg:col-start-2 lg:-mt-6",
    rasio: "aspect-[4/3]",
  },
  {
    src: "/images/sekolah/kelas-otkp.webp",
    alt: "Siswa makan bersama di kelas Otomatisasi dan Tata Kelola Perkantoran",
    ket: "Makan bergizi bersama di kelas perkantoran.",
    kelas: "lg:col-span-6 lg:mt-6",
    rasio: "aspect-[16/10]",
  },
  {
    src: "/images/sekolah/kultum.webp",
    alt: "Siswa mendengarkan kultum di musala sekolah",
    ket: "Kultum bersama di musala.",
    kelas: "lg:col-span-10 lg:col-start-2",
    rasio: "aspect-[16/8] lg:aspect-[21/7]",
  },
];

type FotoDb = { id: string; judul: string | null; gambar: string };

export function KehidupanSekolah({ galeri = [] }: { galeri?: FotoDb[] }) {
  const akar = useRef<HTMLElement>(null);
  // Galeri dari admin menggantikan foto bawaan bila minimal tiga foto aktif; tata letak tetap memakai lima slot yang sama.
  const daftar =
    galeri.length >= 3
      ? galeri.slice(0, FOTO.length).map((g, i) => ({
          src: g.gambar,
          alt: g.judul ?? "Foto kegiatan SMK Ma'arif NU 1 Wangon",
          ket: g.judul ?? "",
          kelas: FOTO[i].kelas,
          rasio: FOTO[i].rasio,
        }))
      : FOTO;

  // Tiap foto terbuka dengan klip dari bawah, isinya bergeser pelan (parallax), lalu redup saat keluar layar.
  useGsapPublik(akar, {
    animasi: ({ gsap, SplitText, akar: el }) => {
      const judul = el.querySelector<HTMLElement>("[data-judul-hidup]");
      const split = judul ? SplitText.create(judul, { aria: "none", type: "words", mask: "words" }) : null;
      if (split) {
        gsap.from(split.words, {
          yPercent: 110,
          duration: 0.8,
          ease: "expo.out",
          stagger: 0.05,
          scrollTrigger: { trigger: judul, start: "top 85%", once: true },
        });
      }

      gsap.utils.toArray<HTMLElement>("[data-bingkai]", el).forEach((bingkai) => {
        const gambar = bingkai.querySelector<HTMLElement>("[data-gambar]");
        gsap.fromTo(
          bingkai,
          { clipPath: "inset(100% 0% 0% 0% round 14px)" },
          {
            clipPath: "inset(0% 0% 0% 0% round 14px)",
            duration: 1.1,
            ease: "expo.out",
            scrollTrigger: { trigger: bingkai, start: "top 88%", once: true },
          },
        );
        if (gambar) {
          gsap.fromTo(gambar, { yPercent: -9, scale: 1.12 }, { yPercent: 9, scale: 1.12, ease: "none", scrollTrigger: { trigger: bingkai, start: "top bottom", end: "bottom top", scrub: true } });
        }
        gsap.to(bingkai, {
          opacity: 0.4,
          ease: "none",
          scrollTrigger: { trigger: bingkai, start: "bottom 30%", end: "bottom top", scrub: true },
        });
      });

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

        <div className="mt-10 grid gap-x-5 gap-y-8 lg:mt-14 lg:grid-cols-12">
          {daftar.map((f) => (
            <figure key={f.src} className={cn("flex flex-col gap-3", f.kelas)}>
              <div data-bingkai className={cn("relative w-full overflow-hidden rounded-kartu bg-permukaan-alt", f.rasio)}>
                <div data-gambar className="absolute inset-0 will-change-transform">
                  <GambarKonten src={f.src} alt={f.alt} sizes="(min-width: 1024px) 60vw, 100vw" />
                </div>
              </div>
              {f.ket && <figcaption className="text-sm text-tinta-redup">{f.ket}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
