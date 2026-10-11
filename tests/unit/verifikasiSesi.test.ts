// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buatToken, type PeranAdmin } from "@/server/auth/sesi";
import { prisma } from "@/server/db/client";
import { GalatApi } from "@/server/types/galat";

// cookies() dari next/headers butuh konteks request; di test kita ganti dengan penyimpanan sederhana.
let cookieAdmin: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nama: string) => (nama === "spmb_admin" && cookieAdmin ? { value: cookieAdmin } : undefined) }),
}));

const { wajibSesiAdmin } = await import("@/server/auth/verifikasiSesi");

async function galatDari(p: Promise<unknown>): Promise<GalatApi> {
  try {
    await p;
  } catch (e) {
    return e as GalatApi;
  }
  throw new Error("Seharusnya melempar galat.");
}

// Sesi diverifikasi ke database: akun harus ada dan aktif, perannya dibaca dari sana.
async function sesiSebagai(id: number, peran: PeranAdmin, nama: string) {
  await prisma.user.upsert({
    where: { id: BigInt(id) },
    create: { id: BigInt(id), name: nama, username: `uji-sesi-${id}`, passwordHash: "x", peran, mustChangePassword: false },
    update: { peran, name: nama, isActive: true, mustChangePassword: false },
  });
  cookieAdmin = await buatToken({ sub: String(id), peran, nama });
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: { startsWith: "uji-sesi-" } } });
  await prisma.$disconnect();
});

describe("wajibSesiAdmin", () => {
  beforeEach(() => {
    cookieAdmin = undefined;
  });

  it("tanpa cookie: 401", async () => {
    expect((await galatDari(wajibSesiAdmin())).status).toBe(401);
  });

  it("cookie sampah: 401", async () => {
    cookieAdmin = "bukan-jwt";
    expect((await galatDari(wajibSesiAdmin())).status).toBe(401);
  });

  it("terautentikasi tanpa batas peran: lolos", async () => {
    await sesiSebagai(71, "konten", "Op");
    expect((await wajibSesiAdmin()).peran).toBe("konten");
  });

  it("peran konten ditolak di endpoint khusus panitia dan superadmin: 403", async () => {
    await sesiSebagai(71, "konten", "Op");
    expect((await galatDari(wajibSesiAdmin("panitia", "superadmin"))).status).toBe(403);
  });

  it("peran yang diizinkan lolos", async () => {
    await sesiSebagai(72, "superadmin", "Ketua");
    expect((await wajibSesiAdmin("superadmin")).sub).toBe("72");
  });
});
