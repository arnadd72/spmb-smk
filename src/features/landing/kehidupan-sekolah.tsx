"use client";

import { useRef } from "react";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { FotoDuotone } from "./foto-duotone";

// Foto asli dari situs sekolah. Keterangan di bawah foto, bukan di atasnya (tanpa label menimpa gambar).
const FOTO = [
  {
    src: "/images/sekolah/p5-karya.webp",
    alt: "Siswa dan guru menunjukkan tempat sampah hasil karya kelas di halaman sekolah",
    w: 1280,
    h: 719,
    ket: "Gelar karya: tempat sampah daur ulang buatan siswa kelas XI.",
    kelas: "lg:col-span-7 lg:row-span-2",
    rasio: "aspect-[16/10] lg:aspect-auto lg:h-full",
  },
  {
    src: "/images/sekolah/praktik-tkr.webp",
    alt: "Siswa jurusan TKR memeriksa roda mobil di bengkel sekolah",
    w: 1400,
    h: 700,
    ket: "Praktik perawatan kendaraan ringan di bengkel.",
    kelas: "lg:col-span-5",
    rasio: "aspect-[2/1]",
  },
  {
    src: "/images/sekolah/p5-kostum.webp",
    alt: "Siswi memakai kostum dari bahan daur ulang pada Projek Penguatan Profil Pelajar Pancasila",
    w: 1400,
    h: 700,
    ket: "Pawai karya Projek Penguatan Profil Pelajar Pancasila.",
    kelas: "lg:col-span-5",
    rasio: "aspect-[2/1]",
  },
  {
    src: "/images/sekolah/kultum.webp",
    alt: "Siswa mendengarkan kultum di musala sekolah",
    w: 1280,
    h: 719,
    ket: "Kultum bersama di musala.",
    kelas: "lg:col-span-12",
    rasio: "aspect-[16/8] lg:aspect-[21/8]",
  },
];

export function KehidupanSekolah() {
  const akar = useRef<HTMLElement>(null);

  // Foto tumbuh dari 0,9 ke 1 saat masuk layar, lalu sedikit redup saat keluar (hierarki perhatian).
  useGsapPublik(akar, {
    animasi: ({ gsap, akar: el }) => {
      gsap.utils.toArray<HTMLElement>("[data-foto-galeri]", el).forEach((foto) => {
        gsap.fromTo(
          foto,
          { scale: 0.9 },
          { scale: 1, ease: "none", scrollTrigger: { trigger: foto, start: "top 95%", end: "top 45%", scrub: true } },
        );
        gsap.to(foto, {
          opacity: 0.45,
          ease: "none",
          scrollTrigger: { trigger: foto, start: "bottom 35%", end: "bottom top", scrub: true },
        });
      });
    },
  });

  return (
    <section ref={akar} id="kehidupan-sekolah" aria-labelledby="judul-kehidupan" className="bg-latar py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 id="judul-kehidupan" className="max-w-2xl text-3xl font-extrabold text-primer-tua sm:text-4xl lg:text-5xl">
          Belajar, berkarya, dan beribadah bersama di Wangon.
        </h2>

        <div className="mt-10 grid gap-6 lg:mt-14 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-10">
          {FOTO.map((f) => (
            <figure key={f.src} className={`flex flex-col gap-3 ${f.kelas}`}>
              <div data-foto-galeri className="origin-center will-change-transform lg:flex-1">
                <FotoDuotone
                  src={f.src}
                  alt={f.alt}
                  width={f.w}
                  height={f.h}
                  nada="lembut"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  pembungkus={`${f.rasio} w-full rounded-kartu`}
                  className="size-full"
                />
              </div>
              <figcaption className="text-sm text-tinta-redup">{f.ket}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
