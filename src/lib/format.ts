const TZ = "Asia/Jakarta";

/** 11 Oktober 2026 */
export function formatTanggal(d: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(d));
}

/** 11 Oktober 2026, 09.30 WIB */
export function formatTanggalWaktu(d: Date | string): string {
  const x = new Date(d);
  const jam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(x).replace(":", ".");
  return `${formatTanggal(x)}, ${jam} WIB`;
}

/** 12,5 (koma desimal, tanpa pembulatan berlebih) */
export function formatAngka(n: number, desimal = 1): string {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: desimal }).format(n);
}
