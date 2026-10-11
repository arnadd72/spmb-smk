// @vitest-environment node
import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buatToken, type PeranAdmin } from "@/server/auth/sesi";
import { prisma } from "@/server/db/client";

// cookies() dari next/headers butuh konteks request; di test diganti penyimpanan sederhana.
let cookieAdmin: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "spmb_admin" && cookieAdmin ? { value: cookieAdmin } : undefined) }),
}));

type Handler = (req: Request, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response>;
// Next selalu mengirim konteks params ke rute dinamis; di test kita kirim nilai apa saja.
const konteks = { params: Promise.resolve({ id: "1", kode: "AKL", slug: "x" }) };
const rute = import.meta.glob<Record<string, Handler | undefined>>("/src/app/api/v1/admin/**/route.ts");

// Rute admin yang sengaja boleh diakses tanpa sesi.
const PUBLIK = ["/login/route.ts", "/logout/route.ts"];
const METODE = ["GET", "POST", "PUT", "PATCH", "DELETE"];

// Handler hasil tangani() bertipe sesuai argumennya; di test semuanya dipanggil dengan satu Request.
const panggil = (h: unknown, r: Request) => (h as Handler)(r, konteks);

const req = (metode: string) =>
  new Request("http://localhost:3000/api/v1/admin/x", { method: metode, headers: { "sec-fetch-site": "same-origin" } });

// Sesi kini diverifikasi ke database (akun harus ada, aktif, dan perannya dibaca dari sana), jadi akun uji dibuat dulu.
async function sesiSebagai(peran: PeranAdmin) {
  await prisma.user.upsert({
    where: { id: BigInt(9) },
    create: { id: BigInt(9), name: "Uji", username: "uji-akses", passwordHash: "x", peran, mustChangePassword: false },
    update: { peran, mustChangePassword: false, isActive: true },
  });
  cookieAdmin = await buatToken({ sub: "9", peran, nama: "Uji" });
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: BigInt(9) } });
  await prisma.$disconnect();
});

beforeEach(() => {
  cookieAdmin = undefined;
});

describe("akses rute admin", () => {
  it("menemukan semua rute admin (penjaga agar pemindaian tidak diam-diam kosong)", () => {
    expect(Object.keys(rute).length).toBeGreaterThanOrEqual(20);
  });

  it("SEMUA rute admin menjawab 401 tanpa sesi, kecuali login dan logout", async () => {
    const dicek: string[] = [];

    for (const [path, muat] of Object.entries(rute)) {
      if (PUBLIK.some((p) => path.endsWith(p))) continue;
      const modul = await muat();
      for (const metode of METODE) {
        const handler = modul[metode];
        if (!handler) continue;
        const res = await handler(req(metode), konteks);
        expect(res.status, `${metode} ${path} harus 401 tanpa sesi`).toBe(401);
        dicek.push(`${metode} ${path}`);
      }
    }

    expect(dicek.length).toBeGreaterThanOrEqual(25);
  });

  it("token sampah diperlakukan sama seperti tanpa sesi", async () => {
    cookieAdmin = "bukan-jwt";
    const { GET } = await import("@/app/api/v1/admin/jurusan/route");
    expect((await panggil(GET, req("GET"))).status).toBe(401);
  });

  it("peran konten ditolak (403) di data referensi, panitia dan superadmin diizinkan", async () => {
    const { GET } = await import("@/app/api/v1/admin/jurusan/route");

    await sesiSebagai("konten");
    expect((await panggil(GET, req("GET"))).status).toBe(403);

    await sesiSebagai("panitia");
    expect((await panggil(GET, req("GET"))).status).toBe(200);

    await sesiSebagai("superadmin");
    expect((await panggil(GET, req("GET"))).status).toBe(200);
  });

  it("rute Google Drive hanya untuk superadmin", async () => {
    const { GET } = await import("@/app/api/v1/admin/google-drive/status/route");

    await sesiSebagai("panitia");
    expect((await panggil(GET, req("GET"))).status).toBe(403);

    await sesiSebagai("superadmin");
    const res = await panggil(GET, req("GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ terhubung: false });
  });

  it("hubungkan Google Drive tanpa kredensial menjawab 503 yang jelas", async () => {
    const { GET } = await import("@/app/api/v1/admin/google-drive/hubungkan/route");
    const awal = { id: process.env.GOOGLE_DRIVE_CLIENT_ID, rahasia: process.env.GOOGLE_DRIVE_CLIENT_SECRET };
    delete process.env.GOOGLE_DRIVE_CLIENT_ID;
    delete process.env.GOOGLE_DRIVE_CLIENT_SECRET;

    await sesiSebagai("superadmin");
    const res = await panggil(GET, req("GET"));

    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("NOT_CONFIGURED");
    if (awal.id) process.env.GOOGLE_DRIVE_CLIENT_ID = awal.id;
    if (awal.rahasia) process.env.GOOGLE_DRIVE_CLIENT_SECRET = awal.rahasia;
  });

  it("mutasi dari origin lain ditolak 403 sebelum menyentuh data", async () => {
    const { POST } = await import("@/app/api/v1/admin/google-drive/putuskan/route");
    await sesiSebagai("superadmin");

    const res = await panggil(POST, new Request("http://localhost:3000/x", { method: "POST", headers: { "sec-fetch-site": "cross-site" } }));

    expect(res.status).toBe(403);
  });

  it("konten: operator konten dan superadmin boleh, panitia ditolak (403)", async () => {
    const { GET } = await import("@/app/api/v1/admin/berita/route");

    await sesiSebagai("panitia");
    expect((await panggil(GET, new NextRequest("http://localhost:3000/api/v1/admin/berita?per=5"))).status).toBe(403);

    await sesiSebagai("konten");
    expect((await panggil(GET, new NextRequest("http://localhost:3000/api/v1/admin/berita?per=5"))).status).toBe(200);

    await sesiSebagai("superadmin");
    expect((await panggil(GET, new NextRequest("http://localhost:3000/api/v1/admin/berita?per=5"))).status).toBe(200);
  });

  it("pengaturan dan ubah jurusan hanya superadmin", async () => {
    const pengaturan = await import("@/app/api/v1/admin/pengaturan/route");
    for (const peran of ["panitia", "konten"] as const) {
      await sesiSebagai(peran);
      expect((await panggil(pengaturan.GET, req("GET"))).status, `pengaturan untuk ${peran}`).toBe(403);
    }
    await sesiSebagai("superadmin");
    expect((await panggil(pengaturan.GET, req("GET"))).status).toBe(200);
  });
});
