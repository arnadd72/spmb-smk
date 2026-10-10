const TZ = "Asia/Jakarta";

/** 11 Oktober 2026 */
export function formatTanggal(d: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(d));
}

/** 12,5 (koma desimal, tanpa pembulatan berlebih) */
export function formatAngka(n: number, desimal = 1): string {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: desimal }).format(n);
}
