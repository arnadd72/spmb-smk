import { describe, expect, it } from "vitest";
import { kelompokkanKeunggulan } from "@/lib/keunggulan-jurusan";

describe("kelompokkanKeunggulan", () => {
  it("baris berakhir titik dua jadi judul; penanda yang ditulis admin dipertahankan apa adanya", () => {
    const hasil = kelompokkanKeunggulan([
      "Kerjasama Dunia Usaha Dan Dunia Industri Jurusan Akl :",
      "1.    Rita Ritelindo Purwokerto",
      "2) Bri Kantor Cabang Ajibarang",
      "Tempat Pkl:",
      "- Rita Supermall",
      "• Kantor Pajak",
      "Tanpa penanda sama sekali",
    ]);
    expect(hasil).toEqual([
      {
        judul: "Kerjasama Dunia Usaha Dan Dunia Industri Jurusan Akl",
        butir: [
          { penanda: "1.", isi: "Rita Ritelindo Purwokerto" },
          { penanda: "2)", isi: "Bri Kantor Cabang Ajibarang" },
        ],
      },
      {
        judul: "Tempat Pkl",
        butir: [
          { penanda: "-", isi: "Rita Supermall" },
          { penanda: "•", isi: "Kantor Pajak" },
          { penanda: null, isi: "Tanpa penanda sama sekali" },
        ],
      },
    ]);
  });

  it("butir tanpa judul ditampung di kelompok tanpa judul; angka tanpa titik bukan penanda; daftar kosong aman", () => {
    expect(kelompokkanKeunggulan(["Praktik aplikasi akuntansi", "2026 tahun ajaran baru"])).toEqual([
      { judul: null, butir: [{ penanda: null, isi: "Praktik aplikasi akuntansi" }, { penanda: null, isi: "2026 tahun ajaran baru" }] },
    ]);
    expect(kelompokkanKeunggulan([])).toEqual([]);
  });
});
