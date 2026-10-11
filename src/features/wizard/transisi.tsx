"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Transisi antar langkah: geser tipis + fade, 220 ms, nonaktif bila reduced motion (PRD 10.4, motion wizard 2/10). */
export function Transisi({ children }: { children: ReactNode }) {
  const kurangi = useReducedMotion();
  if (kurangi) return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
