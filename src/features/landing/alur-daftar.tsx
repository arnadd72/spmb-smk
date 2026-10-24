"use client";

import { useRef, type ComponentType } from "react";
import {
  ChartBarHorizontalIcon,
  ClipboardTextIcon,
  IdentificationCardIcon,
  PaperPlaneTiltIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { useGsapPublik } from "@/components/motion/use-gsap";
import { cn } from "@/lib/cn";

type Tahap = { judul: string; isi: string; warna: string; Ikon: ComponentType<{ className?: string; weight?: "duotone" | "regular"; "aria-hidden"?: boolean }> };

// Alur sesuai PRD (wizard 8 langkah diringkas jadi 5 tahap yang dipahami orang tua).
const TAHAP: Tahap[] = [
  { judul: "Isi data diri", isi: "Nama, NISN, dan tanggal lahir. Tanpa membuat akun.", warna: "bg-kuning text-ink", Ikon: IdentificationCardIcon },
  { judul: "Unggah dokumen", isi: "Akta dan kartu keluarga dapat diunggah bila tersedia. Fotonya dibaca di HP untuk membantu mengisi data.", warna: "bg-mint text-ink", Ikon: UploadSimpleIcon },
  { judul: "Lihat saran jurusan", isi: "Kerjakan tes minat bakat (opsional) untuk mendapat saran. Tanpa tes, Anda tetap memilih jurusan sendiri.", warna: "bg-ink text-kertas", Ikon: ChartBarHorizontalIcon },
  { judul: "Kirim dan simpan nomor", isi: "Terima nomor pendaftaran dan formulir PDF yang bisa dicetak.", warna: "bg-jingga text-ink", Ikon: PaperPlaneTiltIcon },
  { judul: "Bawa berkas ke sekolah", isi: "Pendaftaran langsung diterima. Jadwal datang dan berkas yang dibawa diumumkan di grup WhatsApp pendaftar.", warna: "bg-primer text-kertas", Ikon: ClipboardTextIcon },
];

export function AlurDaftar() {
  const akar = useRef<HTMLElement>(null);

  // Kartu bertumpuk: tiap kartu menempel di atas, kartu berikutnya menimpanya, kartu di bawah mengecil dan meredup.
  useGsapPublik(akar, {
    animasi: ({ gsap, SplitText, akar: el }) => {
      const judul = el.querySelector<HTMLElement>("[data-judul-alur]");
      const split = judul ? SplitText.create(judul, { aria: "none", type: "words", mask: "words", wordsClass: "kata" }) : null;
      if (split) {
        gsap.from(split.words, {
          yPercent: 110,
          duration: 0.8,
          ease: "expo.out",
          stagger: 0.06,
          scrollTrigger: { trigger: judul, start: "top 85%", once: true },
        });
      }

      const kartu = gsap.utils.toArray<HTMLElement>("[data-kartu]", el);
      kartu.forEach((k, i) => {
        const berikut = kartu[i + 1];
        if (!berikut) return;
        // Nilai awal filter wajib eksplisit: dari "none" GSAP menginterpolasi mulai brightness(0) dan kartu menghitam.
        gsap.fromTo(
          k,
          { scale: 1, filter: "brightness(1)" },
          {
            scale: 0.93 - (kartu.length - i) * 0.004,
            filter: "brightness(0.8)",
            ease: "none",
            scrollTrigger: { trigger: berikut, start: "top 92%", end: "top 18%", scrub: true },
          },
        );
      });

      // Angka besar berputar sedikit saat kartu masuk (gerak bermakna: urutan tahap).
      gsap.utils.toArray<HTMLElement>("[data-angka-besar]", el).forEach((a) => {
        gsap.from(a, { yPercent: 40, rotate: -8, opacity: 0, duration: 0.8, ease: "expo.out", scrollTrigger: { trigger: a, start: "top 90%", once: true } });
      });

      return () => split?.revert();
    },
  });

  return (
    <section ref={akar} id="alur-daftar" aria-labelledby="judul-alur" className="bg-latar pb-20 pt-16 lg:pb-28 lg:pt-24">
      <div className="wadah ">
        <h2
          id="judul-alur"
          data-judul-alur
          className="max-w-[16ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[0.96] tracking-[-0.015em] text-ink"
        >
          Daftar dari HP, selesai dalam satu sore.
        </h2>

        <ol className="mt-8 lg:mt-10">
          {TAHAP.map((t, i) => (
            <li
              key={t.judul}
              data-kartu
              style={{ top: `calc(4.75rem + ${i} * 0.7rem)` }}
              className={cn(
                "sticky mb-4 grid min-h-[11rem] origin-top gap-4 overflow-hidden rounded-kartu p-5 will-change-transform sm:p-7 lg:mb-6 lg:min-h-[13.5rem] lg:grid-cols-[1fr_auto] lg:items-end lg:p-8",
                t.warna,
              )}
            >
              <div className="flex h-full flex-col justify-between gap-6">
                <p data-angka-besar className="angka font-display text-[clamp(2.5rem,5vw,4.25rem)] font-bold leading-[0.8] tracking-[-0.03em]">
                  {i + 1}
                </p>
                <div>
                  <h3 className="text-[clamp(1.25rem,2.1vw,1.75rem)] font-bold leading-[1.05] tracking-[-0.02em]">{t.judul}</h3>
                  <p className="mt-2 max-w-[46ch] text-sm font-medium lg:text-base">{t.isi}</p>
                </div>
              </div>
              <t.Ikon aria-hidden weight="duotone" className="hidden size-20 opacity-90 lg:block xl:size-24" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
