// Captcha Cloudflare Turnstile untuk login admin (PRD 1.3 butir 86). Permintaan manual lewat fetch, tanpa SDK.
// Aktif hanya bila TURNSTILE_SITE_KEY dan TURNSTILE_SECRET_KEY sama-sama diisi. Kosong = captcha mati dan login
// berjalan seperti sebelumnya (dev lokal, e2e, dan deploy yang kuncinya belum diisi).

const ALAMAT_PERIKSA = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const captchaAktif = () => Boolean(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);

/** Site key untuk widget di halaman login, atau null bila captcha mati. Site key memang publik. */
export const siteKeyTurnstile = (): string | null => (captchaAktif() ? process.env.TURNSTILE_SITE_KEY! : null);

let sudahDiperingatkan = false;
function peringatkanSekali() {
  if (sudahDiperingatkan || process.env.NODE_ENV !== "production") return;
  sudahDiperingatkan = true;
  console.warn("[turnstile] TURNSTILE_SITE_KEY/TURNSTILE_SECRET_KEY kosong: captcha login admin mati.");
}

/**
 * true bila token lolos atau captcha mati. Gagal tertutup: token kosong, ditolak Cloudflare, galat jaringan,
 * atau kena batas waktu menghasilkan false.
 */
export async function periksaTurnstile(token: string | undefined, ip?: string, batasWaktuMs = 8000): Promise<boolean> {
  if (!captchaAktif()) {
    peringatkanSekali();
    return true;
  }
  if (!token) return false;

  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
  if (ip) body.set("remoteip", ip);

  const pengendali = new AbortController();
  const timer = setTimeout(() => pengendali.abort(), batasWaktuMs);
  try {
    const res = await fetch(ALAMAT_PERIKSA, { method: "POST", body, signal: pengendali.signal });
    if (!res.ok) {
      console.error("[turnstile] status", res.status);
      return false;
    }
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) console.warn("[turnstile] ditolak", data["error-codes"]?.join(",") ?? "");
    return data.success === true;
  } catch (e) {
    console.error("[turnstile] gagal menghubungi Cloudflare", e instanceof Error ? e.message : e);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
