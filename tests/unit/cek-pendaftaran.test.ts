// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-cek-"));

// Cookie sesi Cek Pendaftaran yang bisa diatur per test.
const sesi = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "spmb_edit" && sesi.token ? { value: sesi.token } : undefined) }),
}));

import { GET as unduhFormulir } from "@/app/api/v1/edit-formulir/formulir/route";
import { prisma } from "@/server/db/client";
import { buatDraf } from "@/server/services/draf";
import { buatTokenEditFormulir, NAMA_COOKIE_EDIT } from "@/server/services/editFormulir";
import { kirimPendaftaran } from "@/server/services/pendaftaran";
import { seedFormField, seedReferensi } from "../../prisma/seed-lib";
import { isiLengkap } from "../fixture-wizard";

async function bersih() {
  await prisma.pendaftar.deleteMany();
  await prisma.pendaftaranDraft.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.pengaturan.deleteMany();
}

beforeAll(async () => {
  await bersih();
  await seedReferensi(prisma);
  await seedFormField(prisma);
});
beforeEach(async () => {
  await bersih();
  sesi.token = undefined;
});
afterAll(async () => {
  await bersih();
  await prisma.$disconnect();
});

describe("unduh ulang formulir dari Cek Pendaftaran (poin D)", () => {
  it("nama cookie sesi sama dengan yang dibaca test", () => {
    expect(NAMA_COOKIE_EDIT).toBe("spmb_edit");
  });

  it("dengan sesi yang sah: PDF formulir pendaftar itu sendiri, diunduh, tanpa cache", async () => {
    const { token } = await buatDraf();
    await isiLengkap(token);
    const { nomor } = await kirimPendaftaran(token, true);
    const p = await prisma.pendaftar.findUniqueOrThrow({ where: { nomorPendaftaran: nomor } });
    sesi.token = await buatTokenEditFormulir(p.id.toString());

    const res = await unduhFormulir();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(`attachment; filename="Formulir-${nomor}.pdf"`);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const pdf = await PDFDocument.load(new Uint8Array(await res.arrayBuffer()));
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });

  it("tanpa sesi atau sesi palsu: 401", async () => {
    expect((await unduhFormulir()).status).toBe(401);
    sesi.token = "bukan.token.sah";
    expect((await unduhFormulir()).status).toBe(401);
  });
});
