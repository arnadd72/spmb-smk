import { prisma } from "@/server/db/client";

type Isi = Record<string, unknown> | null;

export type CatatanAudit = {
  userId?: string;
  aksi: string;
  entitasTipe?: string;
  entitasId?: string;
  dataLama?: Isi;
  dataBaru?: Isi;
  ip?: string;
};

// Aman untuk JSON: BigInt jadi string. Nilai rahasia tidak boleh dikirim ke sini oleh pemanggil.
function bersihkan(isi: Isi | undefined) {
  if (!isi) return undefined;
  return JSON.parse(JSON.stringify(isi, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
}

/** Catat aksi penting (PRD v3.1 17: login, verifikasi, edit, koreksi nilai, lihat dokumen, ekspor, pengaturan). */
export async function catatAudit(c: CatatanAudit): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: c.userId ? BigInt(c.userId) : null,
      aksi: c.aksi,
      entitasTipe: c.entitasTipe,
      entitasId: c.entitasId,
      dataLama: bersihkan(c.dataLama),
      dataBaru: bersihkan(c.dataBaru),
      ip: c.ip,
    },
  });
}
