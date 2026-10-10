// @vitest-environment node
import bcrypt from "bcryptjs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { BATAS_GAGAL, loginAdmin } from "@/server/actions/loginAdmin";
import { bacaToken } from "@/server/auth/sesi";
import { prisma } from "@/server/db/client";
import { GalatApi } from "@/server/types/galat";

const PASSWORD = "PasswordUji-123";

async function buatUser(data: { username: string; isActive?: boolean; peran?: "superadmin" | "panitia" | "konten" }) {
  return prisma.user.create({
    data: {
      name: "Petugas Uji",
      username: data.username,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      peran: data.peran ?? "panitia",
      isActive: data.isActive ?? true,
    },
  });
}

beforeEach(async () => {
  await prisma.percobaanLogin.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.percobaanLogin.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

async function galatDari(p: Promise<unknown>): Promise<GalatApi> {
  try {
    await p;
  } catch (e) {
    return e as GalatApi;
  }
  throw new Error("Seharusnya melempar galat.");
}

describe("loginAdmin", () => {
  it("login benar menerbitkan token berisi peran dan mencatat lastLoginAt", async () => {
    await buatUser({ username: "budi", peran: "konten" });

    const hasil = await loginAdmin({ username: "Budi", password: PASSWORD });

    expect(hasil.user.peran).toBe("konten");
    expect((await bacaToken(hasil.token))?.peran).toBe("konten");
    expect((await prisma.user.findUnique({ where: { username: "budi" } }))?.lastLoginAt).not.toBeNull();
  });

  it("password salah dan username tak dikenal menghasilkan pesan yang sama (tidak membocorkan akun)", async () => {
    await buatUser({ username: "budi" });

    const salahPassword = await galatDari(loginAdmin({ username: "budi", password: "salah" }));
    const salahUser = await galatDari(loginAdmin({ username: "tidak-ada", password: PASSWORD }));

    expect(salahPassword.status).toBe(401);
    expect(salahPassword.message).toBe(salahUser.message);
    expect(salahPassword.code).toBe(salahUser.code);
  });

  it("akun nonaktif ditolak dengan pesan yang sama", async () => {
    await buatUser({ username: "nonaktif", isActive: false });

    const g = await galatDari(loginAdmin({ username: "nonaktif", password: PASSWORD }));

    expect(g.status).toBe(401);
    expect(g.message).toBe("Username atau password salah.");
  });

  it("setelah 5 percobaan gagal, login ditolak 429 bahkan dengan password benar", async () => {
    await buatUser({ username: "budi" });
    for (let i = 0; i < BATAS_GAGAL; i++) {
      await galatDari(loginAdmin({ username: "budi", password: "salah" }));
    }

    const g = await galatDari(loginAdmin({ username: "budi", password: PASSWORD }));

    expect(g.status).toBe(429);
  });

  it("throttle per username: username lain tidak terpengaruh", async () => {
    await buatUser({ username: "budi" });
    await buatUser({ username: "sari" });
    for (let i = 0; i < BATAS_GAGAL; i++) await galatDari(loginAdmin({ username: "budi", password: "x" }));

    await expect(loginAdmin({ username: "sari", password: PASSWORD })).resolves.toBeDefined();
  });

  it("percobaan gagal lebih lama dari 15 menit tidak dihitung", async () => {
    await buatUser({ username: "budi" });
    await prisma.percobaanLogin.createMany({
      data: Array.from({ length: BATAS_GAGAL }, () => ({
        username: "budi",
        berhasil: false,
        createdAt: new Date(Date.now() - 20 * 60_000),
      })),
    });

    await expect(loginAdmin({ username: "budi", password: PASSWORD })).resolves.toBeDefined();
  });

  it("login berhasil membersihkan hitungan gagal", async () => {
    await buatUser({ username: "budi" });
    await galatDari(loginAdmin({ username: "budi", password: "salah" }));
    await loginAdmin({ username: "budi", password: PASSWORD });

    expect(await prisma.percobaanLogin.count({ where: { username: "budi" } })).toBe(0);
  });
});
