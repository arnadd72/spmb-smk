import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/client";
import { buatToken, type PeranAdmin } from "@/server/auth/sesi";
import { catatAudit } from "@/server/services/audit";
import { GalatApi } from "@/server/types/galat";
import type { InputLogin } from "@/server/validasi/auth";

// Throttle login (PRD v4 17): 5 percobaan gagal per username per 15 menit, dihitung di tabel
// PercobaanLogin karena tidak ada middleware throttle bawaan.
export const BATAS_GAGAL = 5;
export const JENDELA_MENIT = 15;

// Hash tiruan (dibuat sekali, lazy) agar waktu respons username tak dikenal setara dengan password salah.
let hashTiruan: string | undefined;
function ambilHashTiruan(): string {
  return (hashTiruan ??= bcrypt.hashSync("password-tiruan-untuk-menyamakan-waktu", 12));
}

export type HasilLogin = {
  token: string;
  user: { id: string; nama: string; peran: PeranAdmin };
};

export async function loginAdmin(input: InputLogin, ip?: string): Promise<HasilLogin> {
  const username = input.username.trim().toLowerCase();
  const sejak = new Date(Date.now() - JENDELA_MENIT * 60_000);

  const gagal = await prisma.percobaanLogin.count({
    where: { username, berhasil: false, createdAt: { gte: sejak } },
  });
  if (gagal >= BATAS_GAGAL) throw GalatApi.terlaluBanyak();

  const user = await prisma.user.findUnique({ where: { username } });
  const cocok = await bcrypt.compare(input.password, user?.passwordHash ?? ambilHashTiruan());

  if (!user || !user.isActive || !cocok) {
    await prisma.percobaanLogin.create({ data: { username, ip, berhasil: false } });
    // Pesan sama untuk username salah, password salah, dan akun nonaktif.
    throw new GalatApi(401, "INVALID_CREDENTIALS", "Username atau password salah.");
  }

  // Login berhasil membersihkan hitungan gagal username ini.
  await prisma.percobaanLogin.deleteMany({ where: { username } });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await catatAudit({ userId: user.id.toString(), aksi: "login", entitasTipe: "user", entitasId: user.id.toString(), ip });

  const token = await buatToken({ sub: user.id.toString(), peran: user.peran, nama: user.name });
  return {
    token,
    user: {
      id: user.id.toString(),
      nama: user.name,
      peran: user.peran,
    },
  };
}
