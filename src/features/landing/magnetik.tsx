"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Elemen yang tertarik pelan ke arah kursor (hanya perangkat dengan penunjuk halus dan tanpa reduced motion).
 * Memakai gsap.quickTo di luar siklus render React, bukan useState (PRD 16.5, taste-skill 3.B).
 */
export function Magnetik({ children, kekuatan = 0.35, className }: { children: ReactNode; kekuatan?: number; className?: string }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;

    let batal = false;
    let lepas: (() => void) | undefined;

    (async () => {
      const { default: gsap } = await import("gsap");
      if (batal) return;
      const ke_x = gsap.quickTo(node, "x", { duration: 0.5, ease: "power3.out" });
      const ke_y = gsap.quickTo(node, "y", { duration: 0.5, ease: "power3.out" });

      const gerak = (e: PointerEvent) => {
        const r = node.getBoundingClientRect();
        ke_x((e.clientX - (r.left + r.width / 2)) * kekuatan);
        ke_y((e.clientY - (r.top + r.height / 2)) * kekuatan);
      };
      const keluar = () => {
        ke_x(0);
        ke_y(0);
      };
      node.addEventListener("pointermove", gerak);
      node.addEventListener("pointerleave", keluar);
      lepas = () => {
        node.removeEventListener("pointermove", gerak);
        node.removeEventListener("pointerleave", keluar);
        gsap.set(node, { x: 0, y: 0 });
      };
    })();

    return () => {
      batal = true;
      lepas?.();
    };
  }, [kekuatan]);

  return (
    <div ref={el} className={className ?? "inline-block"}>
      {children}
    </div>
  );
}
