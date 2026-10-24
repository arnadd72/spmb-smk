"use client";

import { motion } from "motion/react";
import { useKurangiGerak } from "@/components/motion/use-kurangi-gerak";
import type { ReactNode } from "react";

type StaggerListProps = {
  children: ReactNode[];
  className?: string;
  /** Jeda antar item, detik. */
  jeda?: number;
};

/** Daftar yang masuk berurutan (mis. kartu rekomendasi, PRD 10.4 Langkah 4). */
export function StaggerList({ children, className, jeda = 0.06 }: StaggerListProps) {
  const kurangiGerak = useKurangiGerak();

  if (kurangiGerak) {
    return (
      <ul className={className}>
        {children.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    );
  }

  return (
    <motion.ul
      className={className}
      initial="sembunyi"
      animate="tampil"
      variants={{ tampil: { transition: { staggerChildren: jeda } } }}
    >
      {children.map((c, i) => (
        <motion.li
          key={i}
          variants={{
            sembunyi: { opacity: 0, y: 12 },
            tampil: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
          }}
        >
          {c}
        </motion.li>
      ))}
    </motion.ul>
  );
}
