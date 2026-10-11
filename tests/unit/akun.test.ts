// @vitest-environment node
import bcrypt from "bcryptjs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buatAkun, buatPasswordSementara, daftarAkun, ubahAkun } from "@/server/actions/akun";
import { bacaFilterAudit, daftarAudit, statistikOcr } from "@/server/actions/auditLog";
import { loginAdmin } from "@/server/actions/loginAdmin";
import { ambilSesiAdmin, wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import type { GalatApi } from "@/server/types/galat";

let cookieAdmin: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "spmb_admin" && cookieAdmin ? { value: cookieAdmin } : undefined) }),
}));

async function bersih() {
  await prisma.ocrHasil.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.percobaanLogin.deleteMany();
  await prisma.user.deleteMany();
}

let sa: bigint;
beforeEach(async () => {
  await bersih();
  cookieAdmin = undefined;
  const u = await prisma.user.create({ data: { name: "Super Satu", username: "super1", passwordHash: await bcrypt.hash("PasswordSuper123", 4), peran: "superadmin", mustChangePassword: false } });
  sa = u.id;
});
afterAll(async () => {
  await bersih();
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
const ctx = () => ({ userId: sa.toString(), ip: "127.0.0.1" });

describe("password sementara", () => {
  it("14 karakter, memuat huruf dan angka, tanpa karakter membingungkan, acak", () => {
    const set = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const p = buatPasswordSementara();
      expect(p).toHaveLength(14);
      expect(p).toMatch(/[A-Za-z]/);
      expect(p).toMatch(/\d/);
      expect(p).not.toMatch(/[0OIl1]/);
      set.add(p);
    }
    expect(set.size).toBe(200);
  });
});

describe("kelola akun", () => {
  it("buat akun: password sementara ditampilkan sekali, tersimpan sebagai hash, langsung bisa dipakai masuk, tidak muncul di audit", async () => {
    const h = await buatAkun({ nama: "Budi Panitia", username: "Budi.Panitia", peran: "panitia" }, ctx());
    expect(h.username).toBe("budi.panitia");
    const u = await prisma.user.findUniqueOrThrow({ where: { username: "budi.panitia" } });
    expect(u.passwordHash).not.toContain(h.passwordSementara);
    expect(await bcrypt.compare(h.passwordSementara, u.passwordHash)).toBe(true);
    expect([u.isActive, u.peran]).toEqual([true, "panitia"]);

    cookieAdmin = (await loginAdmin({ username: "budi.panitia", password: h.passwordSementara })).token;
    await expect(wajibSesiAdmin("panitia")).resolves.toMatchObject({ peran: "panitia" });
    const audit = JSON.stringify(await prisma.auditLog.findMany(), (_k, v) => (typeof v === "bigint" ? v.toString() : v));
    expect(audit).not.toContain(h.passwordSementara);
    expect(await daftarAkun()).toHaveLength(2);
  });

  it("username ganda dan format tak sah ditolak", async () => {
    await buatAkun({ nama: "Satu", username: "satu", peran: "konten" }, ctx());
    expect((await galat(buatAkun({ nama: "Dua", username: "SATU", peran: "konten" }, ctx()))).errors?.username).toBeDefined();
    await expect(buatAkun({ nama: "Dua", username: "a b", peran: "konten" }, ctx())).rejects.toThrow();
    await expect(buatAkun({ nama: "Dua", username: "ab", peran: "konten" }, ctx())).rejects.toThrow();
    await expect(buatAkun({ nama: "Dua", username: "dua", peran: "dewa" }, ctx())).rejects.toThrow();
    await expect(buatAkun({ nama: "D", username: "dua", peran: "konten" }, ctx())).rejects.toThrow();
  });

  it("nonaktifkan: sesi yang sedang berjalan langsung ditolak; aktifkan kembali memulihkannya", async () => {
    const h = await buatAkun({ nama: "Cici", username: "cici", peran: "panitia" }, ctx());
    await prisma.user.update({ where: { username: "cici" }, data: { mustChangePassword: false } });
    const { token } = await loginAdmin({ username: "cici", password: h.passwordSementara });
    cookieAdmin = token;
    expect((await wajibSesiAdmin("panitia")).nama).toBe("Cici");

    await ubahAkun(h.id, { isActive: false }, ctx());
    expect(await ambilSesiAdmin()).toBeNull();
    expect((await galat(wajibSesiAdmin("panitia"))).status).toBe(401);
    expect((await galat(loginAdmin({ username: "cici", password: h.passwordSementara }))).status).toBe(401);

    await ubahAkun(h.id, { isActive: true }, ctx());
    expect((await wajibSesiAdmin("panitia")).nama).toBe("Cici");
  });

  it("perubahan peran langsung berlaku pada sesi lama (peran dibaca dari database)", async () => {
    const h = await buatAkun({ nama: "Dedi", username: "dedi", peran: "superadmin" }, ctx());
    await prisma.user.update({ where: { username: "dedi" }, data: { mustChangePassword: false } });
    cookieAdmin = (await loginAdmin({ username: "dedi", password: h.passwordSementara })).token;
    await expect(wajibSesiAdmin("superadmin")).resolves.toBeDefined();

    await ubahAkun(h.id, { peran: "konten" }, ctx());
    expect((await galat(wajibSesiAdmin("superadmin"))).status).toBe(403);
    expect((await ambilSesiAdmin())?.peran).toBe("konten");
  });

  it("reset password: password baru sementara langsung berlaku, password lama ditolak, throttle login dibersihkan", async () => {
    const h = await buatAkun({ nama: "Eka", username: "eka", peran: "panitia" }, ctx());
    cookieAdmin = (await loginAdmin({ username: "eka", password: h.passwordSementara })).token;
    await prisma.percobaanLogin.create({ data: { username: "eka", berhasil: false } });

    const r = await ubahAkun(h.id, { resetPassword: true }, ctx());
    expect(r.passwordSementara).toBeDefined();
    expect(r.passwordSementara).not.toBe(h.passwordSementara);
    await expect(loginAdmin({ username: "eka", password: h.passwordSementara })).rejects.toThrow();
    await expect(loginAdmin({ username: "eka", password: r.passwordSementara! })).resolves.toBeDefined();
    expect(await prisma.auditLog.count({ where: { aksi: "akun.reset_password" } })).toBe(1);
  });

  it("tidak bisa menonaktifkan atau mengubah peran diri sendiri, dan harus tersisa satu superadmin aktif", async () => {
    expect((await galat(ubahAkun(sa.toString(), { isActive: false }, ctx()))).status).toBe(422);
    expect((await galat(ubahAkun(sa.toString(), { peran: "konten" }, ctx()))).status).toBe(422);

    // superadmin kedua menurunkan yang pertama: boleh karena dirinya masih superadmin aktif
    const dua = await buatAkun({ nama: "Super Dua", username: "super2", peran: "superadmin" }, ctx());
    await ubahAkun(sa.toString(), { peran: "panitia" }, { userId: dua.id });
    // sekarang hanya super2 yang tersisa: tidak bisa diturunkan oleh siapa pun lewat akun lain
    const pn = await buatAkun({ nama: "Panitia", username: "panitia1", peran: "panitia" }, { userId: dua.id });
    const e = await galat(ubahAkun(dua.id, { isActive: false }, { userId: pn.id }));
    expect(e.status).toBe(422);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: BigInt(dua.id) } })).isActive).toBe(true);
    expect((await galat(ubahAkun("424242", { nama: "Xx" }, ctx()))).status).toBe(404);
    await expect(ubahAkun(dua.id, {}, ctx())).rejects.toThrow(/Tidak ada perubahan/);
  });
});

describe("login diaudit; audit log dan statistik OCR", () => {
  it("login berhasil tercatat; filter aksi, pelaku, objek, tanggal, dan paginasi bekerja", async () => {
    await loginAdmin({ username: "super1", password: "PasswordSuper123" }, "10.0.0.1");
    for (let i = 0; i < 35; i++) await catatAudit({ userId: sa.toString(), aksi: "kuota.ubah", entitasTipe: "jurusan", entitasId: `J${i}`, dataLama: { a: 1 }, dataBaru: { a: 2 } });
    await catatAudit({ aksi: "pengaturan.ubah", entitasTipe: "pengaturan" });

    const semua = await daftarAudit({});
    expect([semua.total, semua.baris.length, semua.jumlahHalaman]).toEqual([37, 30, 2]);
    expect((await daftarAudit({ halaman: 2 })).baris).toHaveLength(7);

    const login = await daftarAudit({ aksi: "login" });
    expect(login.total).toBe(1);
    expect(login.baris[0]).toMatchObject({ oleh: "Super Satu (super1)", ip: "10.0.0.1", entitas: `user:${sa}` });

    expect((await daftarAudit({ oleh: sa.toString() })).total).toBe(36);
    expect((await daftarAudit({ entitas: "pengaturan" })).baris[0].oleh).toBe("Sistem");
    expect((await daftarAudit({ q: "J7" })).total).toBe(1);
    const hariIni = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    expect((await daftarAudit({ dari: hariIni, sampai: hariIni })).total).toBe(37);
    expect((await daftarAudit({ dari: "2000-01-01", sampai: "2000-01-02" })).total).toBe(0);
    expect(semua.pilihan.aksi).toEqual(["kuota.ubah", "login", "pengaturan.ubah"]);
  });

  it("bacaFilterAudit membuang masukan tak sah", () => {
    expect(bacaFilterAudit({ oleh: "1; drop table", dari: "kemarin", halaman: "-1", aksi: ["login", "x"] })).toMatchObject({ oleh: undefined, dari: undefined, halaman: 1, aksi: "login" });
  });

  it("statistik OCR kosong tidak error; terisi dihitung per jenis dengan persentil", async () => {
    expect((await statistikOcr()).total).toBe(0);
    for (const [jenis, ms, sukses] of [["akta", 100, true], ["akta", 300, true], ["akta", 900, false], ["rapor", 2000, true]] as const) {
      await prisma.ocrHasil.create({ data: { jenis, durasiMs: ms, sukses, fields: {}, confidence: {} } });
    }
    const s = await statistikOcr();
    expect([s.total, s.bulanIni]).toEqual([4, 4]);
    const akta = s.perJenis.find((j) => j.jenis === "akta")!;
    expect([akta.jumlah, akta.sukses, akta.p50, akta.p95]).toEqual([3, 2, 300, 900]);
    expect(s.perJenis.find((j) => j.jenis === "kk")!.jumlah).toBe(0);
  });
});
