"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

const KUNCI = "spmb_pembuka";

/**
 * Tirai pembuka singkat (sekali per sesi). Dirender server supaya tidak berkedip, lalu diangkat oleh GSAP.
 * Cadangan tanpa JS: animasi CSS di globals.css mengangkatnya sendiri setelah 3 detik, dan <noscript>
 * menyembunyikannya. Dilewati untuk reduced motion, kunjungan ulang dalam sesi, dan browser otomatis.
 */
export function Pembuka() {
  const akar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = akar.current;
    if (!el) return;

    const lewati = () => {
      el.style.display = "none";
    };

    let sudah = false;
    try {
      sudah = sessionStorage.getItem(KUNCI) === "1";
    } catch {
      // Penyimpanan diblokir: tampilkan seperti biasa.
    }
    if (sudah || navigator.webdriver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      lewati();
      return;
    }
    try {
      sessionStorage.setItem(KUNCI, "1");
    } catch {
      // abaikan
    }

    let batal = false;
    (async () => {
      const { default: gsap } = await import("gsap");
      if (batal) return;
      el.style.animation = "none"; // matikan cadangan CSS, GSAP yang mengambil alih
      const tl = gsap.timeline({ onComplete: lewati });
      tl.fromTo("[data-lambang]", { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: "back.out(1.6)" })
        .fromTo("[data-sapaan]", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }, "-=0.25")
        .to(el, { yPercent: -100, duration: 0.7, ease: "expo.inOut" }, "+=0.2");
    })();

    return () => {
      batal = true;
    };
  }, []);

  return (
    <>
      <div
        ref={akar}
        aria-hidden
        className="pembuka fixed inset-0 z-[70] grid place-items-center bg-ink text-kertas"
      >
        <div className="flex flex-col items-center gap-4">
          <Image data-lambang src="/images/sekolah/lambang.png" alt="" width={96} height={96} className="size-24 object-contain" priority />
          <p data-sapaan className="font-display text-2xl font-semibold tracking-tight">
            SPMB SMK Ma&apos;arif NU 1 Wangon
          </p>
        </div>
      </div>
      <noscript>
        <style>{".pembuka{display:none!important}"}</style>
      </noscript>
    </>
  );
}
