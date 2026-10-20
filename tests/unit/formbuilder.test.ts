// @vitest-environment node
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

process.env.DRAF_TEMP_DIR = mkdtempSync(path.join(os.tmpdir(), "spmb-fb-"));

import { buatField, daftarFieldAdmin, hapusField, ubahField } from "@/server/actions/formBuilder";
import { ambilPeserta } from "@/server/actions/peserta";
import { prisma } from "@/server/db/client";
import { ambilDraf, buatDraf, muatDefinisiField, simpanLangkah } from "@/server/services/draf";
import { kirimPendaftaran } from "@/server/services/pendaftaran";
import { simpanPengaturan } from "@/server/services/pengaturan";
import type { GalatApi } from "@/server/types/galat";
import { seedFormField, seedReferensi } from "../../prisma/seed-lib";
import { isiLengkap } from "../fixture-wizard";

const ctx = { userId: "1", ip: "127.0.0.1" };

async function bersihkan() {
  await prisma.pendaftar.deleteMany();
  await prisma.pendaftaranDraft.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.pengaturan.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.user.deleteMany();
}

beforeAll(async () => {
  await seedReferensi(prisma);
});
beforeEach(async () => {
  await bersihkan();
  await prisma.user.create({ data: { id: BigInt(1), name: "Super", username: "super", passwordHash: "x", peran: "superadmin" } });
  await seedFormField(prisma);
  await simpanPengaturan("tahun_ajaran", "2027/2028");
});
afterAll(async () => {
  await bersihkan();
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

const dasar = (f: Awaited<ReturnType<typeof daftarFieldAdmin>>[number]) => ({ label: f.label, teksBantuan: f.teksBantuan, tampil: f.tampil, wajib: f.wajib, urutan: f.urutan });

describe("ubah isian bawaan", () => {
  it("label, bantuan, wajib, dan urutan berubah, dicatat di audit; wizard membaca perubahan itu", async () => {
    const f = (await daftarFieldAdmin()).find((x) => x.kunci === "hobi_lain")!;
    expect(f.wajib).toBe(false);
    await ubahField("hobi_lain", { ...dasar(f), label: "Kegiatan lain", teksBantuan: "Isi bila ada", wajib: true, urutan: 5 }, ctx);

    const baru = (await muatDefinisiField()).find((x) => x.kunci === "hobi_lain")!;
    expect([baru.label, baru.teksBantuan, baru.wajib, baru.urutan]).toEqual(["Kegiatan lain", "Isi bila ada", true, 5]);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { aksi: "formfield.ubah" } });
    expect((audit.dataLama as { wajib: boolean }).wajib).toBe(false);
    expect((audit.dataBaru as { wajib: boolean }).wajib).toBe(true);
  });

  it("isian yang disembunyikan hilang dari wizard dan tidak lagi wajib", async () => {
    const f = (await daftarFieldAdmin()).find((x) => x.kunci === "no_wa")!;
    await ubahField("no_wa", { ...dasar(f), tampil: false, wajib: false }, ctx);
    expect((await muatDefinisiField()).some((x) => x.kunci === "no_wa")).toBe(false);

    const { token } = await buatDraf();
    await isiLengkap(token);
    await expect(kirimPendaftaran(token, true)).resolves.toBeDefined();
  });

  it("isian inti terkunci: tidak bisa disembunyikan atau dijadikan opsional, dan tetap wajib walau tabel diubah langsung", async () => {
    const daftar = await daftarFieldAdmin();
    const nama = daftar.find((x) => x.kunci === "nama_lengkap")!;
    expect(nama.terkunci).toBe(true);
    expect((await galat(ubahField("nama_lengkap", { ...dasar(nama), tampil: false }, ctx))).errors?.tampil).toBeDefined();
    expect((await galat(ubahField("nama_lengkap", { ...dasar(nama), wajib: false }, ctx))).status).toBe(422);
    await expect(ubahField("nama_lengkap", { ...dasar(nama), label: "Nama sesuai akta" }, ctx)).resolves.toBeDefined();

    await prisma.formField.update({ where: { kunci: "jurusan_1" }, data: { tampil: false, wajib: false } });
    const j1 = (await muatDefinisiField()).find((x) => x.kunci === "jurusan_1")!;
    expect(j1.wajib).toBe(true);
  });

  it("menolak wajib pada isian tersembunyi, label pendek, urutan tak sah, dan pilihan kurang dari dua", async () => {
    const daftar = await daftarFieldAdmin();
    const f = daftar.find((x) => x.kunci === "hobi_lain")!;
    expect((await galat(ubahField("hobi_lain", { ...dasar(f), tampil: false, wajib: true }, ctx))).status).toBe(422);
    await expect(ubahField("hobi_lain", { ...dasar(f), label: "x" }, ctx)).rejects.toThrow();
    await expect(ubahField("hobi_lain", { ...dasar(f), urutan: -2 }, ctx)).rejects.toThrow();

    const agama = daftar.find((x) => x.kunci === "agama")!;
    expect((await galat(ubahField("agama", { ...dasar(agama), opsi: [{ nilai: "Islam", label: "Islam" }] }, ctx))).errors?.opsi).toBeDefined();
    await ubahField("agama", { ...dasar(agama), opsi: [{ nilai: "Islam", label: "Islam" }, { nilai: "Lainnya", label: "Lainnya" }] }, ctx);
    expect((await muatDefinisiField()).find((x) => x.kunci === "agama")!.opsi).toHaveLength(2);
    expect((await galat(ubahField("tidak_ada", dasar(f), ctx))).status).toBe(404);
  });

  it("pilihan jurusan (dinamis) tidak bisa diubah lewat form builder", async () => {
    const j1 = (await daftarFieldAdmin()).find((x) => x.kunci === "jurusan_1")!;
    expect(j1.opsiDinamis).toBe(true);
    await ubahField("jurusan_1", { ...dasar(j1), opsi: [{ nilai: "X", label: "X" }, { nilai: "Y", label: "Y" }] }, ctx);
    const opsi = (await muatDefinisiField()).find((x) => x.kunci === "jurusan_1")!.opsi!;
    expect(opsi.map((o) => o.nilai)).toContain("AKL");
  });
});

describe("isian kustom", () => {
  it("dibuat dengan kunci unik dari label, memengaruhi wizard, tersimpan di dataKustom, dan tampil di detail admin", async () => {
    const a = await buatField({ langkah: 5, tipe: "text", label: "Ukuran sepatu", teksBantuan: "dalam angka", tampil: true, wajib: true, urutan: 999 }, ctx);
    expect(a.kunci).toBe("kustom_ukuran_sepatu");
    const b = await buatField({ langkah: 5, tipe: "text", label: "Ukuran Sepatu", tampil: true, wajib: false, urutan: 1000 }, ctx);
    expect(b.kunci).toBe("kustom_ukuran_sepatu_2");

    // Wajib di wizard
    const { token } = await buatDraf();
    await isiLengkap(token);
    const tersimpan = (await ambilDraf(token))!.data["5"];
    expect(tersimpan.kustom_ukuran_sepatu).toBeDefined();
    const { kustom_ukuran_sepatu: _dibuang, ...tanpa } = tersimpan;
    void _dibuang;
    const e = await galat(simpanLangkah(token, 5, tanpa));
    expect(e.errors?.kustom_ukuran_sepatu?.[0]).toMatch(/wajib diisi/);

    const fields = await muatDefinisiField();
    expect(fields.find((x) => x.kunci === "kustom_ukuran_sepatu")).toMatchObject({ wajib: true, langkah: 5 });
  });

  it("jawaban isian kustom masuk dataKustom saat submit dan tampil di data peserta", async () => {
    await buatField({ langkah: 6, tipe: "radio", label: "Punya KIP", opsi: [{ nilai: "ya", label: "Ya" }, { nilai: "tidak", label: "Tidak" }], tampil: true, wajib: true, urutan: 999 }, ctx);
    const { token } = await buatDraf();
    await isiLengkap(token); // fixture mengisi semua isian tampil, termasuk yang kustom (radio: opsi pertama)
    await kirimPendaftaran(token, true);
    const p = await prisma.pendaftar.findFirstOrThrow();
    expect(p.dataKustom).toEqual({ kustom_punya_kip: "ya" });
    expect((await ambilPeserta(p.id.toString())).nilai.kustom_punya_kip).toBe("ya");
  });

  it("aturan pembuatan: pilihan butuh opsi, berkas hanya di langkah 2, langkah terbatas", async () => {
    await expect(buatField({ langkah: 5, tipe: "select", label: "Pilihan", opsi: [{ nilai: "a", label: "A" }], tampil: true, wajib: false, urutan: 1 }, ctx)).rejects.toThrow(/minimal 2 pilihan/);
    await expect(buatField({ langkah: 5, tipe: "file", label: "Surat", tampil: true, wajib: false, urutan: 1 }, ctx)).rejects.toThrow(/langkah 2/);
    await expect(buatField({ langkah: 4, tipe: "text", label: "Salah langkah", tampil: true, wajib: false, urutan: 1 }, ctx)).rejects.toThrow(/langkah 2, 5, 6, atau 7/);
    await expect(buatField({ langkah: 5, tipe: "tabel", label: "Tabel", tampil: true, wajib: false, urutan: 1 }, ctx)).rejects.toThrow();
    await expect(buatField({ langkah: 5, tipe: "text", label: "Disembunyikan tapi wajib", tampil: false, wajib: true, urutan: 1 }, ctx)).rejects.toThrow();
    await expect(buatField({ langkah: 2, tipe: "file", label: "Surat keterangan", tampil: true, wajib: false, urutan: 30 }, ctx)).resolves.toMatchObject({ kunci: "kustom_surat_keterangan" });
  });

  it("hapus: hanya isian kustom; bawaan ditolak dengan petunjuk menyembunyikan", async () => {
    const { kunci } = await buatField({ langkah: 5, tipe: "text", label: "Sementara", tampil: true, wajib: false, urutan: 1 }, ctx);
    await hapusField(kunci, ctx);
    expect(await prisma.formField.findUnique({ where: { kunci } })).toBeNull();
    const e = await galat(hapusField("hobi_lain", ctx));
    expect(e.status).toBe(409);
    expect(e.message).toMatch(/Sembunyikan/);
    expect((await galat(hapusField("tidak_ada", ctx))).status).toBe(404);
  });
});
