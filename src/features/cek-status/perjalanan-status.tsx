"use client";

import { useRef, type ComponentType } from "react";
import { MagnifyingGlassIcon, PaperPlaneTiltIcon, SealCheckIcon } from "@phosphor-icons/react";
import { useGsapPublik } from "@/components/motion/use-gsap";

type Tahap = { judul: string; isi: string; Ikon: ComponentType<{ className?: string; weight?: "duotone" | "regular"; "aria-hidden"?: boolean }> };

const TAHAP: Tahap[] = [
  { judul: "Formulir terkirim", isi: "Nomor pendaftaran terbit begitu Anda menekan Kirim di akhir pendaftaran.", Ikon: PaperPlaneTiltIcon },
  { judul: "Panitia memeriksa", isi: "Berkas fisik dicocokkan dengan nilai rapor yang Anda isi.", Ikon: MagnifyingGlassIcon },
  { judul: "Keputusan keluar", isi: "Diterima, perlu revisi, atau ditolak, lengkap dengan catatan panitia.", Ikon: SealCheckIcon },
];

// Tanpa JS atau dengan reduced motion, semua tahap tampil penuh (keadaan akhir). GSAP hanya meredupkan
// lalu menyalakan tahap satu per satu, memakai transform dan opacity saja.
export function PerjalananStatus() {
  const akar = useRef<HTMLElement>(null);

  useGsapPublik(akar, {
    animasi: ({ gsap, akar: el }) => {
      const tahap = gsap.utils.toArray<HTMLElement>("[data-tahap]", el);
      const redup = el.querySelectorAll("[data-isi-tahap]");
      const titik = el.querySelectorAll("[data-titik-aktif]");
      const garis = el.querySelectorAll("[data-garis-isi]");

      gsap.set(redup, { opacity: 0.7 });
      gsap.set(titik, { opacity: 0, scale: 0.6 });
      gsap.set(garis, { scaleY: 0 });

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, defaults: { ease: "power3.out" } });
      tahap.forEach((t, i) => {
        const at = i * 1.5;
        tl.to(t.querySelector("[data-titik-aktif]"), { opacity: 1, scale: 1, duration: 0.5 }, at)
          .to(t.querySelector("[data-cincin]"), { scale: 1.9, opacity: 0, duration: 0.9, ease: "power2.out", startAt: { scale: 1, opacity: 0.55 } }, at)
          .to(t.querySelector("[data-isi-tahap]"), { opacity: 1, duration: 0.5 }, at);
        const g = t.querySelector("[data-garis-isi]");
        if (g) tl.to(g, { scaleY: 1, duration: 1, ease: "none" }, at + 0.35);
      });
      // Tahan keadaan akhir sebentar, lalu kembali redup untuk putaran berikutnya.
      tl.to({}, { duration: 0.6 })
        .to(redup, { opacity: 0.7, duration: 0.5, ease: "power1.inOut" })
        .to(titik, { opacity: 0, scale: 0.6, duration: 0.5, ease: "power1.inOut" }, "<")
        .to(garis, { scaleY: 0, duration: 0.5, ease: "power1.inOut" }, "<");
    },
  });

  return (
    <section ref={akar} aria-labelledby="judul-perjalanan" className="flex flex-col rounded-kartu bg-ink p-6 text-kertas sm:p-8 lg:p-9">
      <h2 id="judul-perjalanan" className="max-w-[18ch] text-[clamp(1.4rem,2.2vw,1.9rem)] font-bold leading-[1.05] tracking-[-0.02em]">
        Perjalanan satu pendaftaran
      </h2>
      <ol className="mt-8 flex flex-1 flex-col">
        {TAHAP.map((t, i) => (
          <li key={t.judul} data-tahap className="relative flex-1 pb-9 pl-16 last:flex-none last:pb-0">
            {i < TAHAP.length - 1 && (
              <span aria-hidden className="absolute bottom-0 left-[1.3125rem] top-11 w-0.5 bg-kertas/20">
                <span data-garis-isi className="absolute inset-0 origin-top bg-mint" />
              </span>
            )}
            <span aria-hidden className="absolute left-0 top-0 grid size-11 place-items-center rounded-full bg-kertas/10 text-kertas/70">
              <t.Ikon aria-hidden weight="regular" className="size-5" />
              <span data-cincin className="absolute inset-0 rounded-full border-2 border-mint opacity-0" />
              <span data-titik-aktif className="absolute inset-0 grid place-items-center rounded-full bg-mint text-ink">
                <t.Ikon aria-hidden weight="duotone" className="size-5" />
              </span>
            </span>
            <div data-isi-tahap>
              <h3 className="text-lg font-bold leading-tight">{t.judul}</h3>
              <p className="mt-1 max-w-[40ch] text-sm leading-relaxed text-kertas/80">{t.isi}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
