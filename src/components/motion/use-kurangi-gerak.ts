"use client";

import { useSyncExternalStore } from "react";

const KUERI = "(prefers-reduced-motion: reduce)";

function langganan(berubah: () => void) {
  const m = window.matchMedia(KUERI);
  m.addEventListener("change", berubah);
  return () => m.removeEventListener("change", berubah);
}

/**
 * Preferensi "kurangi gerak" yang aman untuk hidrasi. `useReducedMotion` dari motion langsung membaca preferensi
 * saat hidrasi, sehingga pengguna dengan kurangi gerak mendapat struktur atau gaya awal yang berbeda dari HTML server
 * (mis. `style="opacity:0"` yang tidak pernah dibetulkan React, dan isinya tetap tak terlihat). Hook ini mengembalikan
 * `false` saat render server dan saat hidrasi, lalu nilai sebenarnya segera sesudahnya.
 */
export function useKurangiGerak(): boolean {
  return useSyncExternalStore(
    langganan,
    () => window.matchMedia(KUERI).matches,
    () => false,
  );
}
