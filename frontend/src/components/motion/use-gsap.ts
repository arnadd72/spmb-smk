"use client";

// GSAP hanya untuk route publik (PRD 16.5). Jangan impor file ini dari wizard atau admin.
// Pemanggil wajib memuat komponennya lewat next/dynamic agar GSAP tidak masuk bundle awal.
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";

export function useGsapPublik(
  lingkup: RefObject<HTMLElement | null>,
  animasi: (gsapInstance: typeof gsap) => void,
  dependensi: unknown[] = [],
) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // Tanpa preferensi kurangi gerak saja animasi dijalankan.
      mm.add("(prefers-reduced-motion: no-preference)", () => animasi(gsap));
      return () => mm.revert();
    },
    { scope: lingkup, dependencies: dependensi },
  );
}
