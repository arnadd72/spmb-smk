"use client";

// GSAP hanya untuk route publik (PRD 16.5). Jangan impor file ini dari wizard atau admin.
// GSAP dimuat lazy lewat import() setelah hidrasi, jadi tidak masuk bundle awal, dan seluruh isi HTML
// tetap dirender server (SEO). Animasi hanya jalan bila perangkat tidak meminta kurangi gerak.
import { useLayoutEffect, type RefObject } from "react";

export type PerkakasGsap = {
  gsap: typeof import("gsap").default;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
  SplitText: typeof import("gsap/SplitText").SplitText;
  /** Akar komponen, untuk selector berlingkup. */
  akar: HTMLElement;
};

type Opsi = {
  /** Dijalankan bila prefers-reduced-motion: no-preference. Boleh mengembalikan fungsi pembersih. */
  animasi: (p: PerkakasGsap) => void | (() => void);
  /** Lebar minimum (px) agar animasi aktif, mis. 1024 untuk pin desktop. */
  minLebar?: number;
};

export function useGsapPublik(akar: RefObject<HTMLElement | null>, { animasi, minLebar }: Opsi) {
  useLayoutEffect(() => {
    const el = akar.current;
    if (!el) return;

    let batal = false;
    let revert: (() => void) | undefined;

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/SplitText"),
      ]);
      if (batal) return;
      gsap.registerPlugin(ScrollTrigger, SplitText);

      const kondisi = minLebar
        ? `(prefers-reduced-motion: no-preference) and (min-width: ${minLebar}px)`
        : "(prefers-reduced-motion: no-preference)";

      // matchMedia otomatis membersihkan animasi dan ScrollTrigger saat kondisi berubah atau di-revert.
      const mm = gsap.matchMedia();
      mm.add(kondisi, () => animasi({ gsap, ScrollTrigger, SplitText, akar: el }), el);
      revert = () => mm.revert();

      // Beberapa bagian membuat ScrollTrigger (dan pin) secara tidak berurutan karena dimuat async.
      // Posisi pin harus dihitung setelah semua pin di atasnya terpasang, jadi urutkan lalu segarkan
      // sekali (debounce lintas komponen).
      const w = window as unknown as { __segarkanSt?: ReturnType<typeof setTimeout> };
      if (w.__segarkanSt) clearTimeout(w.__segarkanSt);
      w.__segarkanSt = setTimeout(() => {
        ScrollTrigger.sort();
        ScrollTrigger.refresh();
      }, 250);
    })();

    return () => {
      batal = true;
      revert?.();
    };
    // Sengaja sekali saat mount: `animasi` dan opsi stabil per komponen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
