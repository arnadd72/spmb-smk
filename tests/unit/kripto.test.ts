// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buatTokenAcak, dekripsi, enkripsi, hashPencarian, hashToken } from "@/server/services/kripto";

describe("kripto", () => {
  it("enkripsi lalu dekripsi mengembalikan teks asli", () => {
    const nik = "3302010101010001";
    const terenkripsi = enkripsi(nik);
    expect(terenkripsi).not.toContain(nik);
    expect(dekripsi(terenkripsi)).toBe(nik);
  });

  it("enkripsi teks yang sama menghasilkan keluaran berbeda (IV acak)", () => {
    expect(enkripsi("sama")).not.toBe(enkripsi("sama"));
  });

  it("data yang diubah ditolak (autentikasi GCM)", () => {
    const t = enkripsi("rahasia");
    const rusak = t.slice(0, -2) + (t.endsWith("AA") ? "BB" : "AA");
    expect(() => dekripsi(rusak)).toThrow();
  });

  it("format tak dikenal ditolak", () => {
    expect(() => dekripsi("v9:abc.def.ghi")).toThrow();
    expect(() => dekripsi("bukan-format")).toThrow();
  });

  it("hashPencarian deterministik dan tidak membalik", () => {
    expect(hashPencarian("3302010101010001")).toBe(hashPencarian(" 3302010101010001 "));
    expect(hashPencarian("a")).not.toBe(hashPencarian("b"));
    expect(hashPencarian("3302010101010001")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("token acak panjang 40, unik, dan hash-nya SHA-256 hex", () => {
    const a = buatTokenAcak();
    expect(a).toHaveLength(40);
    expect(a).not.toBe(buatTokenAcak());
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
  });
});
