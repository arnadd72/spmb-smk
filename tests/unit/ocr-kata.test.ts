// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cocokBulan, tanggalDariKata, angkaDariKata } from "@/lib/ocr/kata";

describe("angkaDariKata", () => {
  it("membaca bilangan Indonesia dalam huruf", () => {
    expect(angkaDariKata("dua puluh enam")).toBe(26);
    expect(angkaDariKata("delapan belas")).toBe(18);
    expect(angkaDariKata("sebelas")).toBe(11);
    expect(angkaDariKata("dua ribu tujuh")).toBe(2007);
    expect(angkaDariKata("dua ribu sembilan belas")).toBe(2019);
    expect(angkaDariKata("seribu sembilan ratus sembilan puluh empat")).toBe(1994);
    expect(angkaDariKata("sepuluh")).toBe(10);
  });

  it("tahan kata menempel, terpecah, dan salah eja ringan dari OCR", () => {
    expect(angkaDariKata("Duapuluh")).toBe(20);
    expect(angkaDariKata("Seribu Sembilanra tus Delapanpuluh Delapan")).toBe(1988);
    expect(angkaDariKata("dua ribu saty")).toBe(2001);
    expect(angkaDariKata("Sembilanpuluh enpa t")).toBe(94);
    expect(angkaDariKata("dua nibu tujuh")).toBe(2007);
  });

  it("tidak menebak teks yang bukan bilangan", () => {
    expect(angkaDariKata("hari sabtu wage")).toBeNull();
    expect(angkaDariKata("")).toBeNull();
  });
});

describe("cocokBulan", () => {
  it("mengenali nama bulan, ejaan lama, dan salah baca OCR", () => {
    expect(cocokBulan("Agustue")).toBe(8);
    expect(cocokBulan("Nopember")).toBe(11);
    expect(cocokBulan("Npember")).toBe(11);
    expect(cocokBulan("Apri1")).toBe(4);
    expect(cocokBulan("FEBRUARI")).toBe(2);
    expect(cocokBulan("Mei")).toBe(5);
    expect(cocokBulan("hari")).toBeNull();
    expect(cocokBulan("tahun")).toBeNull();
  });
});

describe("tanggalDariKata", () => {
  it("menyusun tanggal dari hari, bulan, dan tahun dalam huruf", () => {
    expect(tanggalDariKata("Dua puluh enam Agustue Tabun Dua Ribu Dua, Jam 14.15 Wib")).toBe("2002-08-26");
    expect(tanggalDariKata("delapan belas Nopember tahun dua ribu tujuh")).toBe("2007-11-18");
    expect(tanggalDariKata("dua puluh delapan Apri1, hari : Sabtu Wage dua ribu saty.")).toBe("2001-04-28");
    expect(tanggalDariKata("Enam, bulan Oktober,tahun seribu sembilan ratus Sembilanpuluh enpa t")).toBe("1994-10-06");
    expect(tanggalDariKata("Duapuluh bulan Mei tahun Seribu Sembilanra tus Delapanpuluh Delapan")).toBe("1988-05-20");
    expect(tanggalDariKata("DUA PULUH SATU FEBRUARI tahun DUA RIBU SEBELAS")).toBe("2011-02-21");
  });

  it("menerima angka bila tanggal ditulis dengan angka", () => {
    expect(tanggalDariKata("21 Februari 2011")).toBe("2011-02-21");
  });

  it("null bila bulan, hari, atau tahun tidak lengkap atau tidak sah", () => {
    expect(tanggalDariKata("dua puluh enam tahun dua ribu dua")).toBeNull();
    expect(tanggalDariKata("tiga puluh dua Januari dua ribu dua")).toBeNull();
    expect(tanggalDariKata("lima Mei")).toBeNull();
  });
});
