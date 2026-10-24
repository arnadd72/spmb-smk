"use client";

import { motion } from "motion/react";
import { useKurangiGerak } from "@/components/motion/use-kurangi-gerak";
import type { ReactNode } from "react";

/** Transisi antar langkah: geser tipis + fade, 220 ms, nonaktif bila reduced motion (PRD 10.4, motion wizard 2/10). */
export function Transisi({ children }: { children: ReactNode }) {
  const kurangi = useKurangiGerak();
  if (kurangi) return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
