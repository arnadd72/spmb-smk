// @vitest-environment node
import { describe, expect, it } from "vitest";
import { gabungSaran, nilaiAkhirOcr } from "@/features/wizard/ocr-isian";
import type { FieldOcr, HasilParser } from "@/lib/ocr/tipe";

const f = (nilai: string, keyakinan: FieldOcr["keyakinan"] = "HIGH"): FieldOcr => ({ nilai, keyakinan });
const kosong: FieldOcr = { nilai: "", keyakinan: "NOT_FOUND" };

describe("gabungSaran", () => {
  const akta: HasilParser = { tempat_lahir: f("CILACAP"), jenis_kelamin: f("L"), nama_ayah: f("SUPARNO"), nama_ibu: kosong };
  const kk: HasilParser = { no_kk: f("3301010406080001"), nik: f("3301010903060002"), alamat: f("DUSUN SIDAURIP", "MEDIUM"), nama_ayah: f("SUTARNO", "MEDIUM"), nama_ibu: f("LISA", "MEDIUM") };

  it("memakai Akta untuk data kelahiran dan nama orang tua, KK untuk nomor dan alamat", () => {
    const s = gabungSaran(akta, kk);
    expect(s.tempat_lahir.nilai).toBe("CILACAP");
    expect(s.nama_ayah.nilai).toBe("SUPARNO"); // Akta menang atas KK
    expect(s.nama_ibu.nilai).toBe("LISA"); // Akta kosong, jatuh ke KK
    expect(s.nik.nilai).toBe("3301010903060002");
  });

  it("hanya memuat field yang terisi", () => {
    expect(Object.keys(gabungSaran({ tempat_lahir: kosong }, undefined))).toEqual([]);
    expect(Object.keys(gabungSaran(undefined, undefined))).toEqual([]);
  });
});

describe("nilaiAkhirOcr", () => {
  const saran = gabungSaran(undefined, { nik: f("3301010903060002"), alamat: f("DUSUN A") });

  it("suntingan pendaftar menang atas saran, saran atas nilai awal", () => {
    expect(nilaiAkhirOcr(saran, { alamat: "DUSUN B" }, { nik: "0000000000000000", rt: "001" })).toEqual({
      nik: "3301010903060002",
      alamat: "DUSUN B",
      rt: "001",
    });
  });

  it("nilai yang dikosongkan pendaftar dibuang", () => {
    expect(nilaiAkhirOcr(saran, { alamat: "  " }, {})).toEqual({ nik: "3301010903060002" });
  });
});
