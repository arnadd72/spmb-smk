// Dijalankan sekali saat server Next menyala (PRD v4 butir 84).
// Hosting cPanel Jagoan tidak punya rute IPv6 keluar, dan Node 20 hanya memberi tiap alamat 250 ms
// (autoSelectFamily). IPv4 ke Google butuh sedikit lebih lama, jadi semua percobaan gagal dengan
// "request to https://oauth2.googleapis.com/token failed, reason:" (AggregateError, pesan kosong).
// Matikan pemilihan otomatis dan utamakan IPv4. Di Vercel tidak perlu dan tidak diubah.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.VERCEL) return;

  const [net, dns] = await Promise.all([import("node:net"), import("node:dns")]);
  net.setDefaultAutoSelectFamily(false);
  dns.setDefaultResultOrder("ipv4first");
}
