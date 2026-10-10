import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { KUNCI_PENGATURAN, skemaPengaturan, type KunciPengaturan } from "@/server/validasi/konten";
import type { KonteksAksi } from "./konten";

// Pengaturan sistem yang boleh diubah dari panel (PRD v3.1 13.10). Kunci rahasia (token Drive, dst)
// tidak pernah lewat sini.

export async function ambilSemuaPengaturan(): Promise<Record<KunciPengaturan, string>> {
  const baris = await prisma.pengaturan.findMany({ where: { key: { in: KUNCI_PENGATURAN } } });
  const peta = new Map(baris.map((b) => [b.key, b.value]));
  return Object.fromEntries(KUNCI_PENGATURAN.map((k) => [k, peta.get(k) ?? ""])) as Record<KunciPengaturan, string>;
}

export async function simpanPengaturanAdmin(mentah: unknown, ctx: KonteksAksi) {
  const input = skemaPengaturan.parse(mentah);
  const lama = await ambilSemuaPengaturan();
  const berubah: Partial<Record<KunciPengaturan, string>> = {};

  for (const [kunci, nilai] of Object.entries(input) as [KunciPengaturan, string | undefined][]) {
    if (nilai === undefined || nilai === lama[kunci]) continue;
    await prisma.pengaturan.upsert({ where: { key: kunci }, create: { key: kunci, value: nilai }, update: { value: nilai } });
    berubah[kunci] = nilai;
  }

  if (Object.keys(berubah).length > 0) {
    await catatAudit({ userId: ctx.userId, aksi: "pengaturan.ubah", entitasTipe: "pengaturan", dataLama: lama, dataBaru: berubah, ip: ctx.ip });
  }
  return { ...lama, ...berubah };
}
