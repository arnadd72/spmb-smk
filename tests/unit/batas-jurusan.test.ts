import { describe, expect, it } from "vitest";
import { BATAS_JURUSAN, pecahBaris, periksaBatasDaftar, pesanKelebihan } from "@/server/validasi/batasJurusan";

describe("batas isian jurusan", () => {
  it("batas sesuai keputusan PRD butir 85", () => {
    expect(BATAS_JURUSAN).toEqual({ deskripsi: 5000, prospekBaris: 20, prospekPanjang: 160, keunggulanBaris: 150, keunggulanPanjang: 1500 });
  });

  it("pesanKelebihan: null bila muat, menyebut jumlah dan kelebihan bila lewat", () => {
    expect(pesanKelebihan("Deskripsi", 5000, 5000)).toBeNull();
    expect(pesanKelebihan("Deskripsi", 5120, 5000)).toBe("Deskripsi terlalu panjang: 5120 karakter, maksimal 5000 (kelebihan 120 karakter).");
  });

  it("pecahBaris membuang baris kosong dan merapikan spasi, sama dengan validasi server", () => {
    expect(pecahBaris("  Satu  \n\n   \nDua\n")).toEqual(["Satu", "Dua"]);
  });

  it("periksaBatasDaftar menyebut nomor dan awal tiap baris yang kepanjangan, lalu jumlah baris", () => {
    const hasil = periksaBatasDaftar(["Aman", "Kelas Bekerja merupakan kelas unggulan yang sangat panjang sekali", "Aman"], 40, 2);
    expect(hasil).toEqual([
      { baris: 1, pesan: 'Baris ke-2 ("Kelas Bekerja merupakan kelas …") terlalu panjang: 65 karakter, maksimal 40 (kelebihan 25).' },
      { baris: null, pesan: "Terlalu banyak baris: 3, maksimal 2. Hapus 1 baris." },
    ]);
    expect(periksaBatasDaftar(["a", "b"], 5, 2)).toEqual([]);
  });
});
