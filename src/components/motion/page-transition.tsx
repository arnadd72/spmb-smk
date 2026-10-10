"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type PageTransitionProps = {
  /** Kunci unik per langkah/halaman; berubah = transisi. */
  kunci: string | number;
  children: ReactNode;
  className?: string;
};

/** Geser + fade antar langkah wizard, 250 ms (PRD 10.4, 16.5). Statis bila reduced motion. */
export function PageTransition({ kunci, children, className }: PageTransitionProps) {
  const kurangiGerak = useReducedMotion();
  if (kurangiGerak) return <div className={className}>{children}</div>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={kunci}
        className={className}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
