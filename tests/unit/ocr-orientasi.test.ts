// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bacaanLemah, kekuatanBaca } from "@/lib/ocr/orientasi";
import type { BarisOcr } from "@/lib/ocr/tipe";

const potong = (teks: string, skor: number, n: number): BarisOcr[] => Array.from({ length: n }, (_, i) => ({ teks, kotak: [0, i * 30, 100, i * 30 + 20], skor }));

describe("orientasi foto dokumen", () => {
  it("hasil baca kosong atau sedikit dianggap lemah sehingga putaran lain dicoba", () => {
    expect(bacaanLemah([])).toBe(true);
    expect(bacaanLemah(potong("KARTU KELUARGA", 0.95, 5))).toBe(true);
    expect(bacaanLemah(potong("AH", 0.95, 30))).toBe(true); // potongan terlalu pendek
    expect(bacaanLemah(potong("Nama Kepala Keluarga", 0.95, 12))).toBe(false);
  });

  it("orientasi dengan teks yakin terbanyak lebih kuat; potongan ragu tidak dihitung", () => {
    const tegak = potong("SUKAMANAH", 0.95, 20);
    const terbalik = [...potong("W0H", 0.4, 40), ...potong("XKA", 0.85, 2)];
    expect(kekuatanBaca(tegak)).toBeGreaterThan(kekuatanBaca(terbalik));
    expect(kekuatanBaca(potong("abc", 0.5, 10))).toBe(0);
  });
});

describe("orientasi: teks terbalik yang tampak yakin", () => {
  it("tanpa kata khas dokumen, hasil yakin pun dianggap lemah; kata khas dokumen membuat orientasi lebih kuat", () => {
    const terbalik = potong("HVNVOWVH HASNTITYOV", 0.9, 30);
    const benar = [...potong("KARTU KELUARGA", 0.9, 2), ...potong("Nama Kepala Keluarga", 0.9, 3), ...potong("BELUM KAWIN ANAK WNI", 0.9, 10)];
    expect(bacaanLemah(terbalik)).toBe(true);
    expect(bacaanLemah(benar)).toBe(false);
    expect(kekuatanBaca(benar)).toBeGreaterThan(kekuatanBaca(terbalik));
  });
});
