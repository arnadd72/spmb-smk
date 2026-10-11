// @vitest-environment node
import bcrypt from "bcryptjs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ambilDashboard } from "@/server/actions/dashboard";
import { gantiPassword } from "@/server/actions/gantiPassword";
import { loginAdmin } from "@/server/actions/loginAdmin";
import { bacaToken, buatToken } from "@/server/auth/sesi";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { prisma } from "@/server/db/client";
import { simpanPengaturan } from "@/server/services/pengaturan";
import type { GalatApi } from "@/server/types/galat";
import { seedReferensi } from "../../prisma/seed-lib";
import { buatPendaftarUji } from "../fixture-pendaftar";

let cookieAdmin: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "spmb_admin" && cookieAdmin ? { value: cookieAdmin } : undefined) }),
}));

async function bersih() {
  await prisma.pendaftar.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.percobaanLogin.deleteMany();
  await prisma.pengaturan.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(async () => {
  await bersih();
  cookieAdmin = undefined;
  await simpanPengaturan("tahun_ajaran", "2027/2028");
});
afterAll(async () => {
  await bersih();
  await prisma.bobotJurusan.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.jurusan.deleteMany();
  await prisma.$disconnect();
});

const galat = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as GalatApi;
  }
  throw new Error("Seharusnya melempar galat.");
};

async function buatUser(mustChange: boolean) {
  return prisma.user.create({
    data: { name: "Uji", username: "uji", passwordHash: await bcrypt.hash("PasswordLama123", 4), peran: "panitia", mustChangePassword: mustChange },
  });
}

describe("wajib ganti password", () => {
  it("login akun berstatus mustChangePassword menghasilkan token terkunci; API admin menjawab 403 PASSWORD_CHANGE_REQUIRED", async () => {
    await buatUser(true);
    const { token, user } = await loginAdmin({ username: "uji", password: "PasswordLama123" });
    expect(user.wajibGantiPassword).toBe(true);
    expect((await bacaToken(token))?.mcp).toBe(true);

    cookieAdmin = token;
    const e = await galat(wajibSesiAdmin());
    expect(e.status).toBe(403);
    expect(e.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("akun biasa tidak terkunci", async () => {
    await buatUser(false);
    const { token } = await loginAdmin({ username: "uji", password: "PasswordLama123" });
    cookieAdmin = token;
    await expect(wajibSesiAdmin("panitia")).resolves.toMatchObject({ peran: "panitia" });
  });

  it("ganti password: password lama salah ditolak, kebijakan ditegakkan, sukses membuka kunci dan dicatat audit", async () => {
    const u = await buatUser(true);
    const sesi = { sub: u.id.toString(), peran: "panitia" as const, nama: "Uji", mcp: true };

    const salah = await galat(gantiPassword(sesi, { passwordLama: "salah-lama-1", passwordBaru: "PasswordBaru2026", konfirmasi: "PasswordBaru2026" }));
    expect(salah.errors?.passwordLama).toBeDefined();

    for (const lemah of ["pendek1", "hanyahurufsemua", "1234567890123"]) {
      await expect(gantiPassword(sesi, { passwordLama: "PasswordLama123", passwordBaru: lemah, konfirmasi: lemah })).rejects.toThrow(/Password/);
    }
    await expect(gantiPassword(sesi, { passwordLama: "PasswordLama123", passwordBaru: "PasswordLama123", konfirmasi: "PasswordLama123" })).rejects.toThrow(/berbeda/);
    await expect(gantiPassword(sesi, { passwordLama: "PasswordLama123", passwordBaru: "PasswordBaru2026", konfirmasi: "lain" })).rejects.toThrow(/Konfirmasi/);

    const { token } = await gantiPassword(sesi, { passwordLama: "PasswordLama123", passwordBaru: "PasswordBaru2026", konfirmasi: "PasswordBaru2026" });
    expect((await bacaToken(token))?.mcp).toBe(false);

    const baru = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(baru.mustChangePassword).toBe(false);
    expect(await bcrypt.compare("PasswordBaru2026", baru.passwordHash)).toBe(true);
    expect(await prisma.auditLog.count({ where: { aksi: "password.ganti" } })).toBe(1);
    expect(JSON.stringify(await prisma.auditLog.findMany(), (_k, v) => (typeof v === "bigint" ? v.toString() : v))).not.toContain("PasswordBaru2026");

    await expect(loginAdmin({ username: "uji", password: "PasswordLama123" })).rejects.toThrow();
    expect((await loginAdmin({ username: "uji", password: "PasswordBaru2026" })).user.wajibGantiPassword).toBe(false);
  });

  it("token tanpa mcp tetap sah dan terbaca sebagai tidak terkunci", async () => {
    const token = await buatToken({ sub: "1", peran: "konten", nama: "X" });
    expect((await bacaToken(token))?.mcp).toBe(false);
  });
});

describe("dashboard", () => {
  it("menghitung status, kuota, saran jurusan, per hari, dan peringatan untuk periode berjalan", async () => {
    await seedReferensi(prisma);
    const akl = await prisma.jurusan.findUniqueOrThrow({ where: { kode: "AKL" } });
    await prisma.jurusan.update({ where: { id: akl.id }, data: { kuota: 2 } });

    await buatPendaftarUji({ nomor: "SPMB-2027-0001", status: "pending", jurusan1Id: akl.id });
    await buatPendaftarUji({ nomor: "SPMB-2027-0002", status: "approved", statusNilai: "sesuai", jurusan1Id: akl.id });
    await buatPendaftarUji({ nomor: "SPMB-2027-0003", status: "rejected", berkasSinkron: "gagal" });
    await buatPendaftarUji({ nomor: "SPMB-2026-0001", status: "pending", periode: "2026/2027" });

    const d = await ambilDashboard();
    expect(d.periode).toBe("2027/2028");
    expect([d.total, d.pending, d.approved, d.revisiAtauDitolak]).toEqual([3, 1, 1, 1]);
    expect(d.nilaiBelumDicek).toBe(2);
    const jAkl = d.perJurusan.find((j) => j.kode === "AKL")!;
    expect([jAkl.terdaftar, jAkl.kuota, jAkl.persen]).toEqual([2, 2, 100]);
    expect(d.perHari).toHaveLength(30);
    expect(d.perHari.at(-1)?.jumlah).toBe(3);
    expect(d.terbaru).toHaveLength(3);

    const teks = d.peringatan.map((p) => p.teks).join(" | ");
    expect(teks).toMatch(/Drive belum terhubung/);
    expect(teks).toMatch(/1 pendaftar gagal sinkron/);
    expect(teks).toMatch(/Kuota AKL terisi 100%/);
  });

  it("kosong tidak error", async () => {
    await seedReferensi(prisma);
    const d = await ambilDashboard();
    expect([d.total, d.terbaru.length]).toEqual([0, 0]);
    expect(d.perHari.every((h) => h.jumlah === 0)).toBe(true);
  });
});
