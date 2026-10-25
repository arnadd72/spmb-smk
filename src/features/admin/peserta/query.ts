import type { FilterPeserta } from "@/server/actions/peserta";

/** Susun query string dari filter, dengan sebagian nilai ditimpa. Nilai kosong dibuang. */
export function queryFilter(f: FilterPeserta, timpa: Partial<Record<keyof FilterPeserta, string | number | undefined>> = {}): string {
  const p = new URLSearchParams();
  const gabung = { ...f, ...timpa } as Record<string, string | number | boolean | undefined>;
  for (const [k, v] of Object.entries(gabung)) {
    if (v === undefined || v === "" || (k === "halaman" && Number(v) <= 1)) continue;
    p.set(k, v === true ? "1" : String(v)); // filter centang (ganda) dibaca bacaFilter sebagai "1"
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}
