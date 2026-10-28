import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/client";
import { GalatApi } from "@/server/types/galat";

// Konfirmasi password superadmin untuk aksi yang tidak bisa dibatalkan (hapus pendaftar, hapus akun admin).

const BATAS_SALAH = 5;
const JENDELA_MENIT = 15;

/**
 * Periksa password superadmin yang sedang masuk. 5 kali salah dalam 15 menit mengunci, sama seperti login.
 * `penanda` memisahkan hitungan percobaan tiap jenis aksi (mis. `hapus:{userId}`, `hapus-akun:{userId}`) dan disimpan
 * di PercobaanLogin sebagai pengganti username. Berhasil = catatan percobaan dihapus.
 */
export async function pastikanPasswordSuperadmin(userId: string, password: string, penanda: string, ip?: string): Promise<void> {
  const sejak = new Date(Date.now() - JENDELA_MENIT * 60_000);
  // Periksa batas dan catat percobaan dalam satu langkah yang dikunci per pengguna: permintaan paralel tidak bisa lolos
  // bersamaan karena masing-masing melihat hitungan sebelum percobaannya sendiri dicatat.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${penanda}))`;
    const salah = await tx.percobaanLogin.count({ where: { username: penanda, berhasil: false, createdAt: { gte: sejak } } });
    if (salah >= BATAS_SALAH) throw GalatApi.terlaluBanyak();
    await tx.percobaanLogin.create({ data: { username: penanda, ip, berhasil: false } });
  });

  const user = await prisma.user.findUnique({ where: { id: BigInt(userId) } });
  if (!user || !user.isActive) throw GalatApi.tidakTerautentikasi();
  if (user.peran !== "superadmin") throw GalatApi.dilarang();
  if (!(await bcrypt.compare(password, user.passwordHash))) throw GalatApi.validasi({ password: ["Password salah."] });
  await prisma.percobaanLogin.deleteMany({ where: { username: penanda } });
}
