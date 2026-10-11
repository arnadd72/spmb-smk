import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/client";
import { buatToken, type IsiSesi } from "@/server/auth/sesi";
import { catatAudit } from "@/server/services/audit";
import { GalatApi } from "@/server/types/galat";
import { skemaGantiPassword } from "@/server/validasi/auth";

/** Ganti password sendiri. Sesudahnya mustChangePassword mati dan token baru (tanpa mcp) diterbitkan. */
export async function gantiPassword(sesi: IsiSesi, mentah: unknown, ip?: string): Promise<{ token: string }> {
  const input = skemaGantiPassword.parse(mentah);
  const user = await prisma.user.findUnique({ where: { id: BigInt(sesi.sub) } });
  if (!user || !user.isActive) throw GalatApi.tidakTerautentikasi();

  if (!(await bcrypt.compare(input.passwordLama, user.passwordHash))) {
    throw GalatApi.validasi({ passwordLama: ["Password lama salah."] });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(input.passwordBaru, 12), mustChangePassword: false },
  });
  await catatAudit({ userId: sesi.sub, aksi: "password.ganti", entitasTipe: "user", entitasId: sesi.sub, ip });

  return { token: await buatToken({ sub: sesi.sub, peran: sesi.peran, nama: sesi.nama }) };
}
