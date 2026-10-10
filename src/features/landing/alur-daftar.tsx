"use client";

import { useRef } from "react";
import { useGsapPublik } from "@/components/motion/use-gsap";

// Alur sesuai PRD (wizard 8 langkah diringkas jadi 5 tahap yang dipahami orang tua).
const TAHAP = [
  { judul: "Isi data diri", isi: "Nama, NISN, dan tanggal lahir. Tanpa membuat akun." },
  { judul: "Unggah dokumen", isi: "Foto akta, kartu keluarga, dan rapor. Sistem membaca isinya, Anda tinggal memeriksa." },
  { judul: "Lihat saran jurusan", isi: "Dihitung dari nilai rapor yang Anda konfirmasi. Pilihan akhir tetap di tangan Anda." },
  { judul: "Kirim dan simpan nomor", isi: "Terima nomor pendaftaran dan formulir PDF yang bisa dicetak." },
  { judul: "Bawa berkas ke sekolah", isi: "Panitia mencocokkan berkas fisik dan nilai rapor, lalu memberi keputusan." },
];

export function AlurDaftar() {
  const akar = useRef<HTMLElement>(null);

  // Garis penghubung "digambar" mengikuti gulir; tiap tahap muncul saat garis mencapainya.
  useGsapPublik(akar, {
    animasi: ({ gsap, akar: el }) => {
      gsap.fromTo(
        "[data-garis]",
        { scale: 0 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: el.querySelector("[data-daftar]"), start: "top 75%", end: "bottom 60%", scrub: true },
        },
      );
      gsap.from("[data-tahap]", {
        opacity: 0,
        y: 24,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: el.querySelector("[data-daftar]"), start: "top 80%", once: true },
      });
    },
  });

  return (
    <section ref={akar} id="alur-daftar" aria-labelledby="judul-alur" className="bg-hijau-gelap py-20 text-kertas lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 id="judul-alur" className="max-w-xl text-3xl font-extrabold sm:text-4xl lg:text-5xl">
          Daftar dari HP, selesai dalam satu sore.
        </h2>

        <ol data-daftar className="relative mt-12 grid gap-10 lg:mt-16 lg:grid-cols-5 lg:gap-6">
          {/* Garis vertikal (mobile) dan horizontal (desktop). Hanya satu yang terlihat. */}
          <span aria-hidden className="absolute bottom-3 left-[1.35rem] top-3 w-0.5 bg-kertas/15 lg:hidden">
            <span data-garis className="block h-full w-full origin-top bg-aksen" />
          </span>
          <span aria-hidden className="absolute left-0 right-0 top-[1.35rem] hidden h-0.5 bg-kertas/15 lg:block">
            <span data-garis className="block h-full w-full origin-left bg-aksen" />
          </span>

          {TAHAP.map((t, i) => (
            <li key={t.judul} data-tahap className="relative flex gap-5 lg:block">
              <span className="angka relative z-10 grid size-11 shrink-0 place-items-center rounded-full bg-aksen font-display text-lg font-extrabold text-aksen-tinta">
                {i + 1}
              </span>
              <div className="lg:mt-5">
                <h3 className="text-xl font-bold">{t.judul}</h3>
                <p className="mt-1.5 text-kertas/80">{t.isi}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
