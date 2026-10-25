// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aturanAngka, periksaAngka, saringAngka } from "@/server/validasi/angka";
import { skemaField, type DefinisiField } from "@/server/validasi/wizard";

// Peringatan angka langsung saat mengetik (laporan pemilik, 26 Okt 2026): NIK dan nomor KK tepat 16 digit, NISN 10 digit,
// nomor HP 9 sampai 13 digit, hanya angka. Aturan di sini harus selalu sama dengan skema yang dipakai server saat menyimpan.

describe("aturanAngka", () => {
  it("NIK siswa, ayah, ibu, dan Nomor KK 16 digit; NISN 10 digit; semua isian telepon 9 sampai 13 digit", () => {
    for (const k of ["nik", "nik_ayah", "nik_ibu", "no_kk"]) expect(aturanAngka(k, "text")).toMatchObject({ min: 16, max: 16 });
    expect(aturanAngka("nisn", "text")).toMatchObject({ min: 10, max: 10 });
    for (const k of ["no_hp", "no_wa", "no_hp_ortu", "kustom_telepon_wali"]) expect(aturanAngka(k, "tel")).toMatchObject({ min: 9, max: 13 });
  });

  it("isian lain tidak punya aturan angka langsung", () => {
    expect(aturanAngka("alamat", "text")).toBeNull();
    expect(aturanAngka("tinggi_badan", "number")).toBeNull();
    expect(aturanAngka("email", "email")).toBeNull();
  });
});

describe("saringAngka", () => {
  it("membuang selain angka, memotong ke panjang maksimum, dan melaporkan apa yang dibuang", () => {
    const a = aturanAngka("nik", "text")!;
    expect(saringAngka(a, "3301012204780001")).toEqual({ nilai: "3301012204780001", hurufDibuang: false, kelebihan: false });
    expect(saringAngka(a, "3301 0122 0478 0001")).toEqual({ nilai: "3301012204780001", hurufDibuang: true, kelebihan: false });
    expect(saringAngka(a, "33a01")).toEqual({ nilai: "3301", hurufDibuang: true, kelebihan: false });
    expect(saringAngka(a, "33010122047800019")).toEqual({ nilai: "3301012204780001", hurufDibuang: false, kelebihan: true });
    expect(saringAngka(a, "")).toEqual({ nilai: "", hurufDibuang: false, kelebihan: false });
  });
});

describe("periksaAngka", () => {
  const nik = aturanAngka("nik", "text")!;
  const hp = aturanAngka("no_hp", "tel")!;

  it("kosong: tidak ada pesan", () => {
    expect(periksaAngka(nik, "")).toMatchObject({ status: "kosong", pesan: "" });
  });

  it("belum cukup digit: peringatan yang menyebut jumlah dan batasnya", () => {
    expect(periksaAngka(nik, "330101")).toEqual({ status: "kurang", jumlah: 6, pesan: "Baru 6 dari 16 digit. NIK harus tepat 16 digit angka." });
    expect(periksaAngka(aturanAngka("no_kk", "text")!, "1472").pesan).toBe("Baru 4 dari 16 digit. Nomor KK harus tepat 16 digit angka.");
    expect(periksaAngka(aturanAngka("nisn", "text")!, "123").pesan).toBe("Baru 3 dari 10 digit. NISN harus tepat 10 digit angka.");
    expect(periksaAngka(hp, "0812")).toEqual({ status: "kurang", jumlah: 4, pesan: "Baru 4 digit. Nomor HP harus 9 sampai 13 digit angka." });
  });

  it("jumlah digit sesuai: tanda benar", () => {
    expect(periksaAngka(nik, "3301012204780001")).toEqual({ status: "benar", jumlah: 16, pesan: "16 digit, sudah benar." });
    expect(periksaAngka(hp, "081234567")).toMatchObject({ status: "benar", pesan: "9 digit, sudah benar." });
    expect(periksaAngka(hp, "0812345678901")).toMatchObject({ status: "benar", pesan: "13 digit, sudah benar." });
  });

  it("lebih dari batas atau berisi bukan angka: tidak pernah dianggap benar", () => {
    expect(periksaAngka(nik, "33010122047800019").status).not.toBe("benar");
    expect(periksaAngka(nik, "33010122047800O1").status).not.toBe("benar");
    expect(periksaAngka(hp, "08123456789012").status).not.toBe("benar");
  });
});

describe("keselarasan dengan skema server", () => {
  const def = (kunci: string, tipe: DefinisiField["tipe"]): DefinisiField => ({ kunci, langkah: 5, label: kunci, tipe, wajib: true, urutan: 1 });
  const contoh = ["", "1", "08123456", "081234567", "0812345678901", "08123456789012", "3301012204780001", "330101220478000", "33010122047800017", "33010122047800O1", "0812-3456-7890", "+6281234567890"];

  for (const [kunci, tipe] of [["nik", "text"], ["nik_ayah", "text"], ["no_kk", "text"], ["nisn", "text"], ["no_hp", "tel"], ["no_hp_ortu", "tel"]] as const) {
    it(`${kunci}: "benar" menurut peringatan langsung sama dengan lolos skema server`, () => {
      const aturan = aturanAngka(kunci, tipe)!;
      for (const v of contoh.filter((x) => x !== "")) {
        expect(periksaAngka(aturan, v).status === "benar", `${kunci} "${v}"`).toBe(skemaField(def(kunci, tipe)).safeParse(v).success);
      }
    });
  }
});
