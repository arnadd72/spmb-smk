import { describe, expect, it } from "vitest";
import { kelompokkanKeunggulan } from "@/lib/keunggulan-jurusan";

describe("kelompokkanKeunggulan", () => {
  it("baris berakhir titik dua jadi judul, nomor di depan butir dibuang", () => {
    const hasil = kelompokkanKeunggulan([
      "Kerjasama Dunia Usaha Dan Dunia Industri Jurusan Akl :",
      "1.    Rita Ritelindo Purwokerto",
      "2. Bri Kantor Cabang Ajibarang",
      "Tempat Pkl:",
      "1) Rita Supermall",
    ]);
    expect(hasil).toEqual([
      { judul: "Kerjasama Dunia Usaha Dan Dunia Industri Jurusan Akl", butir: ["Rita Ritelindo Purwokerto", "Bri Kantor Cabang Ajibarang"] },
      { judul: "Tempat Pkl", butir: ["Rita Supermall"] },
    ]);
  });

  it("butir tanpa judul ditampung di kelompok tanpa judul; daftar kosong aman", () => {
    expect(kelompokkanKeunggulan(["Praktik aplikasi akuntansi", "Kunjungan industri"])).toEqual([
      { judul: null, butir: ["Praktik aplikasi akuntansi", "Kunjungan industri"] },
    ]);
    expect(kelompokkanKeunggulan([])).toEqual([]);
  });
});
