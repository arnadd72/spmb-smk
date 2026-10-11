import { timingSafeEqual } from "node:crypto";
import { sinkronSemuaTertunda } from "@/server/actions/berkas";
import { prisma } from "@/server/db/client";
import { bersihkanBerkas, bacaBerkas } from "@/server/services/draf";
import { kirimUlangEmailTertunda } from "@/server/services/notifikasi";
import { statusDrive } from "@/server/services/penyimpanan/driveOAuth";
import { GalatApi } from "@/server/types/galat";

// Tugas harian (PRD v4 20.3). Vercel Hobby membatasi cron satu kali per hari, jadi semuanya dijalankan berurutan
// lewat /api/v1/cron/harian; tiap tugas juga punya endpoint sendiri untuk dipicu manual. Dilindungi CRON_SECRET.

/** Cocokkan header `Authorization: Bearer <CRON_SECRET>` (dikirim Vercel Cron). Tanpa CRON_SECRET, cron dimatikan (503). */
export function periksaCron(req: Request): void {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia || rahasia.length < 16) throw new GalatApi(503, "CRON_DISABLED", "CRON_SECRET belum diisi (minimal 16 karakter); tugas terjadwal dimatikan.");
  const terima = req.headers.get("authorization") ?? "";
  const harapan = `Bearer ${rahasia}`;
  const a = Buffer.from(terima);
  const b = Buffer.from(harapan);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw GalatApi.tidakTerautentikasi("Tidak berwenang.");
}

/** Hapus draf kedaluwarsa. Berkas sementara ikut dihapus hanya untuk draf yang belum dikirim: milik draf terkirim sudah menjadi milik pendaftar. */
export async function bersihkanDraf() {
  const kedaluwarsa = await prisma.pendaftaranDraft.findMany({ where: { expiresAt: { lt: new Date() } }, select: { id: true, berkas: true, submittedAt: true }, take: 500 });
  let berkasDihapus = 0;
  for (const d of kedaluwarsa) {
    if (!d.submittedAt) {
      const b = bacaBerkas({ berkas: d.berkas } as never);
      await bersihkanBerkas(b);
      berkasDihapus += Object.values(b).flatMap((v) => (Array.isArray(v) ? v : v ? [v] : [])).length;
    }
  }
  const hapus = await prisma.pendaftaranDraft.deleteMany({ where: { id: { in: kedaluwarsa.map((d) => d.id) } } });
  return { drafDihapus: hapus.count, berkasDihapus };
}

/** Coba ulang berkas yang belum tersinkron, hanya bila Drive terhubung. */
export async function ulangiSinkronDrive() {
  const drive = await statusDrive().catch(() => ({ terhubung: false }));
  if (!drive.terhubung) return { dilewati: "Google Drive belum terhubung.", diproses: 0, selesai: 0, gagal: 0, menunggu: 0 };
  return sinkronSemuaTertunda(undefined, 50);
}

/** Catatan batas laju (login, cek status, tanya panitia) hanya berguna beberapa menit; buang yang lebih dari dua hari. */
export async function bersihkanCatatanLaju() {
  const hapus = await prisma.percobaanLogin.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 2 * 86_400_000) } } });
  return { dihapus: hapus.count };
}

export async function jalankanHarian() {
  const hasil: Record<string, unknown> = {};
  for (const [nama, tugas] of [
    ["bersihDraf", bersihkanDraf],
    ["catatanLaju", bersihkanCatatanLaju],
    ["sinkronDrive", ulangiSinkronDrive],
    ["emailTertunda", () => kirimUlangEmailTertunda()],
  ] as const) {
    try {
      hasil[nama] = await tugas();
    } catch (e) {
      // Satu tugas gagal tidak menghentikan yang lain.
      hasil[nama] = { galat: e instanceof Error ? e.message : "tidak diketahui" };
    }
  }
  return hasil;
}
