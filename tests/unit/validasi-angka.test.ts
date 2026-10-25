// @vitest-environment node
import { describe, expect, it } from "vitest";
import { skemaField, type DefinisiField } from "@/server/validasi/wizard";
import { galatAngkaOcr, saringAngkaOcr } from "@/server/validasi/ocr";

// Laporan pemilik proyek (26 Okt 2026): NIK siswa, ayah, dan ibu harus tepat 16 digit tanpa huruf; nomor HP 9 sampai 13 digit angka.

const def = (kunci: string, tipe: DefinisiField["tipe"], wajib = true): DefinisiField => ({ kunci, langkah: 5, label: kunci, tipe, wajib, urutan: 1 });
const lolos = (f: DefinisiField, v: unknown) => skemaField(f).safeParse(v).success;
const pesan = (f: DefinisiField, v: unknown) => {
  const r = skemaField(f).safeParse(v);
  return r.success ? null : r.error.issues[0].message;
};

describe("NIK dan nomor KK: tepat 16 digit angka", () => {
  for (const kunci of ["nik", "nik_ayah", "nik_ibu", "no_kk"]) {
    it(`${kunci}: hanya 16 digit angka yang lolos`, () => {
      const f = def(kunci, "text");
      expect(lolos(f, "3301012204780001")).toBe(true);
      for (const salah of ["330101220478000", "33010122047800012", "33010122047800O1", "3301 0122 0478 0001", "3301-0122-0478-0001", "abcdefghijklmnop", "330101220478000a", " 3301012204780001x"]) {
        expect(lolos(f, salah), salah).toBe(false);
      }
      expect(pesan(f, "123")).toMatch(/16 digit/);
    });
  }

  it("NIK ayah dan ibu yang wajib tidak boleh kosong", () => {
    expect(lolos(def("nik_ayah", "text"), "")).toBe(false);
    expect(lolos(def("nik_ibu", "text"), undefined)).toBe(false);
  });
});

describe("nomor HP: 9 sampai 13 digit angka", () => {
  const hp = def("no_hp", "tel");

  it.each(["081234567", "0812345678", "081234567890", "0812345678901", "6281234567890"])("%s lolos", (v) => {
    expect(lolos(hp, v)).toBe(true);
  });

  it.each(["08123456", "08123456789012", "+6281234567890", "0812-3456-7890", "0812 3456 7890", "08123abc7890", "081234567a", "abcdefghijk", "(0281) 513425"])("%s ditolak", (v) => {
    expect(lolos(hp, v)).toBe(false);
  });

  it("pesan menyebut batas digit dan angka saja", () => {
    expect(pesan(hp, "0812")).toMatch(/9 sampai 13 digit angka/);
  });

  it("nomor WhatsApp opsional boleh kosong, tetapi bila diisi harus 9 sampai 13 digit angka", () => {
    const wa = def("no_wa", "tel", false);
    expect(lolos(wa, "")).toBe(true);
    expect(lolos(wa, undefined)).toBe(true);
    expect(lolos(wa, "081234567890")).toBe(true);
    expect(lolos(wa, "123")).toBe(false);
    expect(lolos(wa, "08123abc7890")).toBe(false);
  });

  it("nomor HP orang tua dan isian telepon kustom memakai aturan yang sama", () => {
    expect(lolos(def("no_hp_ortu", "tel"), "081298765432")).toBe(true);
    expect(lolos(def("no_hp_ortu", "tel"), "0812-9876-5432")).toBe(false);
    expect(lolos(def("kustom_telepon_wali", "tel"), "0812987654")).toBe(true);
    expect(lolos(def("kustom_telepon_wali", "tel"), "+62812987654")).toBe(false);
  });
});

describe("isian angka pada kartu hasil baca (OCR)", () => {
  it("saringAngkaOcr membuang selain angka dan memotong ke panjang maksimum", () => {
    expect(saringAngkaOcr("nik_ayah", "33a01-01 2204780001xyz999")).toBe("3301012204780001");
    expect(saringAngkaOcr("nik", "abc")).toBe("");
    expect(saringAngkaOcr("no_kk", "1472022612050006777")).toBe("1472022612050006");
    expect(saringAngkaOcr("rt", "0a0b3c4d")).toBe("003");
    expect(saringAngkaOcr("alamat", "Jl. Mawar No. 5")).toBe("Jl. Mawar No. 5"); // bukan isian angka: tidak disentuh
  });

  it("galatAngkaOcr menandai NIK dan nomor KK yang tidak tepat 16 digit, dan RT atau RW yang bukan 1 sampai 3 digit", () => {
    expect(galatAngkaOcr({ nik: "3301012204780001", nik_ayah: "3301012204780001", nik_ibu: "3301016811830003", no_kk: "1472022612050006", rt: "003", rw: "5" })).toEqual({});
    const g = galatAngkaOcr({ nik: "330101", nik_ayah: "33010122047800O1", nik_ibu: "33010168118300031", no_kk: "x", rt: "1234", rw: "tiga" });
    expect(Object.keys(g).sort()).toEqual(["nik", "nik_ayah", "nik_ibu", "no_kk", "rt", "rw"]);
    expect(g.nik[0]).toMatch(/tepat 16 digit angka/);
    expect(g.rt[0]).toMatch(/1 sampai 3 digit angka/);
  });

  it("isian kosong, tidak dikirim, atau bukan isian angka tidak dianggap galat", () => {
    expect(galatAngkaOcr({ nik: "", nik_ayah: undefined, alamat: "DUSUN", jenis_kelamin: "L" })).toEqual({});
    expect(galatAngkaOcr(null)).toEqual({});
    expect(galatAngkaOcr("teks")).toEqual({});
  });
});
