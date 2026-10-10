"use client";

import { useEffect, useRef } from "react";

/**
 * Gulir halus (Lenis) yang disinkronkan dengan GSAP ScrollTrigger, ditambah bilah progres gulir.
 * Hanya dipasang di layout publik (PRD 16.5). Dimuat lazy, mati total bila pengguna meminta kurangi gerak.
 */
export function SmoothScroll() {
  const bilah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let batal = false;
    let bersihkan: (() => void) | undefined;

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("lenis"),
      ]);
      if (batal) return;
      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({ duration: 1.15, smoothWheel: true, anchors: { offset: -64 } });
      lenis.on("scroll", ScrollTrigger.update);
      const tik = (waktu: number) => lenis.raf(waktu * 1000);
      gsap.ticker.add(tik);
      gsap.ticker.lagSmoothing(0);

      const progres = bilah.current
        ? gsap.fromTo(
            bilah.current,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: "none",
              scrollTrigger: { start: 0, end: "max", scrub: 0.2 },
            },
          )
        : undefined;

      ScrollTrigger.refresh();

      bersihkan = () => {
        progres?.scrollTrigger?.kill();
        progres?.kill();
        gsap.ticker.remove(tik);
        lenis.destroy();
      };
    })();

    return () => {
      batal = true;
      bersihkan?.();
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1">
      <div ref={bilah} className="h-full origin-left scale-x-0 bg-kuning" />
    </div>
  );
}
