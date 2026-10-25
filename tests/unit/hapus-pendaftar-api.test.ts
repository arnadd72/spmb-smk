// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import bcrypt from "bcryptjs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-hapus-api-"));

import { buatToken, type PeranAdmin } from "@/server/auth/sesi";
import { prisma } from "@/server/db/client";
import { buatPendaftarUji } from "../fixture-pendaftar";

// cookies() dari next/headers butuh konteks request; di test diganti penyimpanan sederhana.
let cookieAdmin: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "spmb_admin" && cookieAdmin ? { value: cookieAdmin } : undefined) }),
}));

type Handler = (req: Request) => Promise<Response>;
const PASSWORD = "password-uji-panjang";
const URL_DASAR = "http://localhost:3000/api/v1/admin/hapus-pendaftar";

const kirim = (url: string, badan: unknown, situs = "same-origin") =>
  new Request(url, { method: "POST", headers: { "sec-fetch-site": situs, "content-type": "application/json" }, body: JSON.stringify(badan) });

async function sesiSebagai(peran: PeranAdmin) {
  await prisma.user.upsert({
    where: { id: BigInt(9) },
    create: { id: BigInt(9), name: "Uji", username: "uji-hapus", passwordHash: bcrypt.hashSync(PASSWORD, 4), peran, mustChangePassword: false },
    update: { peran, mustChangePassword: false, isActive: true },
  });
  cookieAdmin = await buatToken({ sub: "9", peran, nama: "Uji" });
}

async function bersih() {
  await prisma.ocrHasil.deleteMany();
  await prisma.pendaftar.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.percobaanLogin.deleteMany();
}

beforeEach(async () => {
  cookieAdmin = undefined;
  await bersih();
});
afterAll(async () => {
  await bersih();
  await prisma.user.deleteMany({ where: { id: BigInt(9) } });
  await prisma.$disconnect();
});

describe("rute hapus pendaftar", () => {
  it("tanpa sesi menjawab 401 di ketiga rute", async () => {
    const { POST: hapus } = await import("@/app/api/v1/admin/hapus-pendaftar/route");
    const { POST: pratinjau } = await import("@/app/api/v1/admin/hapus-pendaftar/pratinjau/route");
    const { GET: cari } = await import("@/app/api/v1/admin/hapus-pendaftar/cari/route");
    expect((await (hapus as Handler)(kirim(URL_DASAR, { ids: ["1"], password: PASSWORD }))).status).toBe(401);
    expect((await (pratinjau as Handler)(kirim(`${URL_DASAR}/pratinjau`, { mode: "manual", ids: ["1"] }))).status).toBe(401);
    expect((await (cari as Handler)(new Request(`${URL_DASAR}/cari?q=a`))).status).toBe(401);
  });

  it("panitia dan operator konten ditolak 403 di ketiga rute", async () => {
    const { POST: hapus } = await import("@/app/api/v1/admin/hapus-pendaftar/route");
    const { POST: pratinjau } = await import("@/app/api/v1/admin/hapus-pendaftar/pratinjau/route");
    const { GET: cari } = await import("@/app/api/v1/admin/hapus-pendaftar/cari/route");
    const p = await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    for (const peran of ["panitia", "konten"] as const) {
      await sesiSebagai(peran);
      expect((await (hapus as Handler)(kirim(URL_DASAR, { ids: [p.id.toString()], password: PASSWORD }))).status).toBe(403);
      expect((await (pratinjau as Handler)(kirim(`${URL_DASAR}/pratinjau`, { mode: "manual", ids: [p.id.toString()] }))).status).toBe(403);
      expect((await (cari as Handler)(new Request(`${URL_DASAR}/cari?q=a`))).status).toBe(403);
    }
    expect(await prisma.pendaftar.count()).toBe(1);
  });

  it("mutasi dari origin lain ditolak 403 sebelum menyentuh data", async () => {
    const { POST: hapus } = await import("@/app/api/v1/admin/hapus-pendaftar/route");
    await sesiSebagai("superadmin");
    const p = await buatPendaftarUji({ nomor: "SPMB-2027-0001" });
    expect((await (hapus as Handler)(kirim(URL_DASAR, { ids: [p.id.toString()], password: PASSWORD }, "cross-site"))).status).toBe(403);
    expect(await prisma.pendaftar.count()).toBe(1);
  });

  it("superadmin: pencarian, pratinjau, lalu hapus dengan password benar", async () => {
    const { POST: hapus } = await import("@/app/api/v1/admin/hapus-pendaftar/route");
    const { POST: pratinjau } = await import("@/app/api/v1/admin/hapus-pendaftar/pratinjau/route");
    const { GET: cari } = await import("@/app/api/v1/admin/hapus-pendaftar/cari/route");
    await sesiSebagai("superadmin");
    const p = await buatPendaftarUji({ nomor: "SPMB-2027-0001", nama: "Ahmad Fauzi" });

    const hasilCari = await (cari as Handler)(new Request(`${URL_DASAR}/cari?q=fauzi&periode=2027%2F2028`));
    expect(hasilCari.status).toBe(200);
    expect((await hasilCari.json()).data.map((b: { nomor: string }) => b.nomor)).toEqual(["SPMB-2027-0001"]);

    const hasilPratinjau = await (pratinjau as Handler)(kirim(`${URL_DASAR}/pratinjau`, { mode: "nomor", periode: "2027/2028", dari: 1, sampai: 1 }));
    expect(hasilPratinjau.status).toBe(200);
    expect((await hasilPratinjau.json()).data.total).toBe(1);

    const salah = await (hapus as Handler)(kirim(URL_DASAR, { ids: [p.id.toString()], password: "salah" }));
    expect(salah.status).toBe(422);
    expect(await prisma.pendaftar.count()).toBe(1);

    const benar = await (hapus as Handler)(kirim(URL_DASAR, { ids: [p.id.toString()], password: PASSWORD }));
    expect(benar.status).toBe(200);
    expect((await benar.json()).data).toEqual({ terhapus: 1, dilewati: 0, gagal: [] });
    expect(await prisma.pendaftar.count()).toBe(0);
  });

  it("badan bukan JSON atau kosong menjawab 422, bukan 500", async () => {
    const { POST: hapus } = await import("@/app/api/v1/admin/hapus-pendaftar/route");
    await sesiSebagai("superadmin");
    const rusak = new Request(URL_DASAR, { method: "POST", headers: { "sec-fetch-site": "same-origin" }, body: "bukan json" });
    expect((await (hapus as Handler)(rusak)).status).toBe(422);
  });
});
