import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { pastikanPasswordSuperadmin } from "@/server/services/konfirmasiPassword";
import { GalatApi } from "@/server/types/galat";
import { skemaAkunBaru, skemaHapusAkun, skemaUbahAkun } from "@/server/validasi/akun";
import type { KonteksAksi } from "./konten";

// Manajemen akun admin oleh superadmin. Password sementara hanya ditampilkan sekali dan wajib diganti saat masuk pertama.

const HURUF = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const ANGKA = "23456789";

/** 14 karakter acak tanpa karakter membingungkan (0/O, 1/l/I), dijamin memuat huruf dan angka. */
export function buatPasswordSementara(): string {
  const semua = HURUF + ANGKA;
  const pilih = (s: string) => s[randomInt(s.length)];
  const karakter = [pilih(HURUF), pilih(HURUF), pilih(ANGKA), pilih(ANGKA), ...Array.from({ length: 10 }, () => pilih(semua))];
  for (let i = karakter.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [karakter[i], karakter[j]] = [karakter[j], karakter[i]];
  }
  return karakter.join("");
}

export type AkunAdmin = {
  id: string;
  nama: string;
  username: string;
  peran: "superadmin" | "panitia" | "konten";
  isActive: boolean;
  loginTerakhir: Date | null;
  dibuat: Date;
};

export async function daftarAkun(): Promise<AkunAdmin[]> {
  const data = await prisma.user.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "asc" }] });
  return data.map((u) => ({
    id: u.id.toString(),
    nama: u.name,
    username: u.username,
    peran: u.peran,
    isActive: u.isActive,
    loginTerakhir: u.lastLoginAt,
    dibuat: u.createdAt,
  }));
}

export async function buatAkun(mentah: unknown, ctx: KonteksAksi) {
  const input = skemaAkunBaru.parse(mentah);
  if (await prisma.user.findUnique({ where: { username: input.username } })) throw GalatApi.validasi({ username: ["Username sudah dipakai."] });

  const passwordSementara = buatPasswordSementara();
  const u = await prisma.user.create({
    data: { name: input.nama, username: input.username, peran: input.peran, passwordHash: await bcrypt.hash(passwordSementara, 12) },
  });
  await catatAudit({ userId: ctx.userId, aksi: "akun.buat", entitasTipe: "user", entitasId: u.id.toString(), dataBaru: { username: u.username, peran: u.peran }, ip: ctx.ip });
  return { id: u.id.toString(), username: u.username, passwordSementara };
}

export async function ubahAkun(id: string, mentah: unknown, ctx: KonteksAksi) {
  if (!/^\d{1,18}$/.test(id)) throw GalatApi.tidakDitemukan("Akun tidak ditemukan.");
  const input = skemaUbahAkun.parse(mentah);
  const lama = await prisma.user.findUnique({ where: { id: BigInt(id) } });
  if (!lama) throw GalatApi.tidakDitemukan("Akun tidak ditemukan.");

  // Superadmin hanya satu akun: tidak ada akun lain yang boleh dinaikkan jadi superadmin.
  if (input.peran === "superadmin" && lama.peran !== "superadmin") {
    throw GalatApi.validasi({ peran: ["Superadmin hanya satu akun dan tidak bisa ditambah."] });
  }

  const diriSendiri = id === ctx.userId;
  if (diriSendiri && (input.isActive === false || (input.peran !== undefined && input.peran !== lama.peran))) {
    throw GalatApi.validasi({ _: ["Anda tidak bisa menonaktifkan atau mengubah peran akun Anda sendiri."] });
  }

  // Selalu sisakan minimal satu superadmin aktif.
  const kehilanganSuperadmin = lama.peran === "superadmin" && lama.isActive && (input.isActive === false || (input.peran !== undefined && input.peran !== "superadmin"));
  if (kehilanganSuperadmin && (await prisma.user.count({ where: { peran: "superadmin", isActive: true, id: { not: lama.id } } })) === 0) {
    throw GalatApi.validasi({ _: ["Harus ada minimal satu superadmin aktif."] });
  }

  const passwordSementara = input.resetPassword ? buatPasswordSementara() : undefined;
  await prisma.user.update({
    where: { id: lama.id },
    data: {
      ...(input.nama !== undefined ? { name: input.nama } : {}),
      ...(input.peran !== undefined ? { peran: input.peran } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(passwordSementara ? { passwordHash: await bcrypt.hash(passwordSementara, 12) } : {}),
    },
  });
  if (passwordSementara) await prisma.percobaanLogin.deleteMany({ where: { username: lama.username } });

  const dataLama = { nama: lama.name, peran: lama.peran, isActive: lama.isActive };
  const dataBaru = { nama: input.nama ?? lama.name, peran: input.peran ?? lama.peran, isActive: input.isActive ?? lama.isActive, ...(passwordSementara ? { passwordDireset: true } : {}) };
  await catatAudit({ userId: ctx.userId, aksi: passwordSementara ? "akun.reset_password" : "akun.ubah", entitasTipe: "user", entitasId: id, dataLama, dataBaru, ip: ctx.ip });
  return { id, ...(passwordSementara ? { passwordSementara } : {}) };
}

/**
 * Hapus akun panitia atau operator konten secara permanen (PRD 1.3 butir 81). Hanya superadmin (dijaga rute API) dan wajib
 * memasukkan password-nya sendiri. Superadmin dan akun sendiri tidak bisa dihapus. Riwayat Audit Log dan data verifikasi
 * pendaftar yang menunjuk ke akun itu tetap ada, hanya pelakunya dikosongkan; identitas akun yang dihapus dicatat di
 * entri audit penghapusan.
 */
export async function hapusAkun(id: string, mentah: unknown, ctx: KonteksAksi) {
  if (!/^\d{1,18}$/.test(id)) throw GalatApi.tidakDitemukan("Akun tidak ditemukan.");
  const { password } = skemaHapusAkun.parse(mentah);
  const lama = await prisma.user.findUnique({ where: { id: BigInt(id) } });
  if (!lama) throw GalatApi.tidakDitemukan("Akun tidak ditemukan.");
  if (id === ctx.userId) throw GalatApi.validasi({ _: ["Anda tidak bisa menghapus akun Anda sendiri."] });
  if (lama.peran === "superadmin") throw GalatApi.validasi({ _: ["Akun superadmin tidak bisa dihapus."] });

  await pastikanPasswordSuperadmin(ctx.userId, password, `hapus-akun:${ctx.userId}`, ctx.ip);

  await prisma.$transaction([
    prisma.auditLog.updateMany({ where: { userId: lama.id }, data: { userId: null } }),
    prisma.pendaftar.updateMany({ where: { diverifikasiOlehId: lama.id }, data: { diverifikasiOlehId: null } }),
    prisma.user.delete({ where: { id: lama.id } }),
  ]);
  await prisma.percobaanLogin.deleteMany({ where: { username: lama.username } });

  await catatAudit({
    userId: ctx.userId,
    aksi: "akun.hapus",
    entitasTipe: "user",
    entitasId: id,
    dataLama: { nama: lama.name, username: lama.username, peran: lama.peran, isActive: lama.isActive },
    ip: ctx.ip,
  });
  return { id, username: lama.username };
}
