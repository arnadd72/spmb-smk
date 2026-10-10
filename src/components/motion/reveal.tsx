"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Detik. Jaga total di bawah 0,35 s untuk transisi UI (PRD 16.5). */
  tunda?: number;
};

/** Muncul saat masuk viewport: hanya opacity dan transform, statis bila reduced motion. */
export function Reveal({ children, className, tunda = 0 }: RevealProps) {
  const kurangiGerak = useReducedMotion();
  if (kurangiGerak) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, delay: tunda, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
