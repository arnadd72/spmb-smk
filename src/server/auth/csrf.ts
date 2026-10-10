import { GalatApi } from "@/server/types/galat";

/**
 * Perlindungan CSRF untuk mutasi (POST/PUT/PATCH/DELETE) berbasis cookie (PRD v4 Bagian 17):
 * tolak bila permintaan datang dari origin lain. Cookie SameSite=Lax sudah menutup sebagian besar kasus,
 * ini lapisan kedua.
 */
export function periksaOrigin(req: Request): void {
  const metode = req.method.toUpperCase();
  if (metode === "GET" || metode === "HEAD" || metode === "OPTIONS") return;

  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite) {
    if (fetchSite === "same-origin" || fetchSite === "none") return;
    throw GalatApi.dilarang("Permintaan dari origin lain ditolak.");
  }

  // Klien tanpa Sec-Fetch-Site (mis. alat uji): cocokkan header Origin dengan Host.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin) return; // bukan permintaan browser lintas-origin
  if (!host || new URL(origin).host !== host) {
    throw GalatApi.dilarang("Permintaan dari origin lain ditolak.");
  }
}
