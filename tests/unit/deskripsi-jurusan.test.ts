import { describe, expect, it } from "vitest";
import { bacaDeskripsi, paragrafPertama } from "@/lib/deskripsi-jurusan";

// Teks nyata dari sekolah (disalin apa adanya, termasuk spasi ganda dan spasi sebelum titik dua).
const DARI_SEKOLAH = `Merupakan Salah Satu Program Keahlian Dalam Kelompok Bisnis Dan Manajemen Yang Bertujuan Untuk Mempelajari Pencatatan Dan Penyusunan Laporan Keuangan.

Kerjasama Dunia Usaha Dan Dunia Industri Jurusan Akl :
1.    Rita Ritelindo Purwokerto
2.    Bri Kantor Cabang Ajibarang

Tempat Pkl Jurusan Akl Diantaranya :
1.    Rita Supermall Purwokerto
2.    Kantor Pajak Pratama Purwokerto
3.    Bprs Artha Leksana Wangon`;

describe("bacaDeskripsi", () => {
  it("paragraf lalu dua daftar bernomor: daftar dikumpulkan agar berjajar, nomor dipisah dari isi", () => {
    expect(bacaDeskripsi(DARI_SEKOLAH)).toEqual([
      { tipe: "paragraf", teks: expect.stringContaining("Merupakan Salah Satu Program Keahlian") },
      {
        tipe: "kumpulan",
        daftar: [
          {
            judul: "Kerjasama Dunia Usaha Dan Dunia Industri Jurusan Akl",
            butir: [
              { penanda: "1.", isi: "Rita Ritelindo Purwokerto" },
              { penanda: "2.", isi: "Bri Kantor Cabang Ajibarang" },
            ],
          },
          {
            judul: "Tempat Pkl Jurusan Akl Diantaranya",
            butir: [
              { penanda: "1.", isi: "Rita Supermall Purwokerto" },
              { penanda: "2.", isi: "Kantor Pajak Pratama Purwokerto" },
              { penanda: "3.", isi: "Bprs Artha Leksana Wangon" },
            ],
          },
        ],
      },
    ]);
  });

  it("daftar tanpa judul (TKR: tiga kompetensi bernomor) tetap jadi daftar; judul berdiri sendiri menempel ke daftar berikutnya", () => {
    expect(bacaDeskripsi("Kompeten dalam bidang\n\n1. Mesin\n2. Chasis\n3. Kelistrikan")).toEqual([
      { tipe: "paragraf", teks: "Kompeten dalam bidang" },
      { tipe: "kumpulan", daftar: [{ judul: null, butir: [{ penanda: "1.", isi: "Mesin" }, { penanda: "2.", isi: "Chasis" }, { penanda: "3.", isi: "Kelistrikan" }] }] },
    ]);
    expect(bacaDeskripsi("Prestasi:\n\n- Juara 1\n- Juara 2")).toEqual([
      { tipe: "kumpulan", daftar: [{ judul: "Prestasi", butir: [{ penanda: "-", isi: "Juara 1" }, { penanda: "-", isi: "Juara 2" }] }] },
    ]);
  });

  it("paragraf biasa dipertahankan baris barunya; kosong, null, dan CRLF aman", () => {
    expect(bacaDeskripsi("Baris satu\nbaris dua")).toEqual([{ tipe: "paragraf", teks: "Baris satu\nbaris dua" }]);
    expect(bacaDeskripsi("")).toEqual([]);
    expect(bacaDeskripsi(null)).toEqual([]);
    expect(bacaDeskripsi("A\r\n\r\nB")).toEqual([{ tipe: "paragraf", teks: "A" }, { tipe: "paragraf", teks: "B" }]);
  });
});

describe("paragrafPertama", () => {
  it("hanya paragraf pertama, dalam satu baris", () => {
    expect(paragrafPertama(DARI_SEKOLAH).startsWith("Merupakan Salah Satu")).toBe(true);
    expect(paragrafPertama(DARI_SEKOLAH)).not.toContain("Kerjasama");
    expect(paragrafPertama("Satu\ndua\n\nTiga")).toBe("Satu dua");
    expect(paragrafPertama(null)).toBe("");
  });
});
