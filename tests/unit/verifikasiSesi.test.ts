// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buatToken } from "@/server/auth/sesi";
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
    cookieAdmin = await buatToken({ sub: "1", peran: "konten", nama: "Op" });
    expect((await wajibSesiAdmin()).peran).toBe("konten");
  });

  it("peran konten ditolak di endpoint khusus panitia dan superadmin: 403", async () => {
    cookieAdmin = await buatToken({ sub: "1", peran: "konten", nama: "Op" });
    expect((await galatDari(wajibSesiAdmin("panitia", "superadmin"))).status).toBe(403);
  });

  it("peran yang diizinkan lolos", async () => {
    cookieAdmin = await buatToken({ sub: "2", peran: "superadmin", nama: "Ketua" });
    expect((await wajibSesiAdmin("superadmin")).sub).toBe("2");
  });
});
