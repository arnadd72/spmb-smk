// @vitest-environment node
import { describe, expect, it } from "vitest";
import { perkirakanSudut } from "@/lib/ocr/deskew";

/** Gambar abu-abu berisi garis teks gelap yang menurun ke kanan sebesar `derajat`. */
function garisMiring(derajat: number, lebar = 480, tinggi = 360): Uint8Array {
  const abu = new Uint8Array(lebar * tinggi).fill(240);
  const t = Math.tan((derajat * Math.PI) / 180);
  for (let y = 0; y < tinggi; y++) {
    for (let x = 0; x < lebar; x++) {
      const m = (((y - x * t) % 26) + 26) % 26;
      if (m < 4 && x > 20 && x < lebar - 20) abu[y * lebar + x] = 30;
    }
  }
  return abu;
}

describe("perkirakanSudut", () => {
  it.each([0, 2, 3.5, -4, 6, -7.5])("memperkirakan kemiringan %s derajat", (d) => {
    const hasil = perkirakanSudut(garisMiring(d), 480, 360);
    expect(Math.abs(hasil - d)).toBeLessThanOrEqual(0.4);
  });

  it("mengembalikan 0 untuk gambar kosong atau terlalu kecil", () => {
    expect(perkirakanSudut(new Uint8Array(480 * 360).fill(255), 480, 360)).toBe(0);
    expect(perkirakanSudut(new Uint8Array(100), 10, 10)).toBe(0);
  });
});
