// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { kompresGambar, profilBerkas } from "@/server/services/kompresi";

const jpeg = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 120, g: 160, b: 200 } } }).jpeg().toBuffer();
const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 30, g: 90, b: 60 } } }).png().toBuffer();

describe("kompresGambar", () => {
  it("dokumen: JPEG, sisi terpanjang maksimal 2000 px", async () => {
    const h = await kompresGambar(await jpeg(4000, 3000), "image/jpeg", "dokumen");
    const m = await sharp(h.isi).metadata();
    expect([m.width, m.height]).toEqual([2000, 1500]);
    expect(m.format).toBe("jpeg");
    expect(h).toMatchObject({ mime: "image/jpeg", ext: "jpg" });
  });

  it("pasFoto: JPEG, muat dalam 900x1200", async () => {
    const h = await kompresGambar(await png(1800, 2400), "image/png", "pasFoto");
    const m = await sharp(h.isi).metadata();
    expect(m.width).toBeLessThanOrEqual(900);
    expect(m.height).toBeLessThanOrEqual(1200);
    expect(h.mime).toBe("image/jpeg");
  });

  it("web: WebP, sisi terpanjang maksimal 1600 px", async () => {
    const h = await kompresGambar(await jpeg(3200, 1800), "image/jpeg", "web");
    const m = await sharp(h.isi).metadata();
    expect([m.width, m.height]).toEqual([1600, 900]);
    expect(m.format).toBe("webp");
    expect(h).toMatchObject({ mime: "image/webp", ext: "webp" });
  });

  it("logo: maksimal 512 px dan transparansi dipertahankan", async () => {
    const asli = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: await png(512, 512), top: 256, left: 256 }])
      .png()
      .toBuffer();
    const h = await kompresGambar(asli, "image/png", "logo");
    const m = await sharp(h.isi).metadata();
    expect(Math.max(m.width ?? 0, m.height ?? 0)).toBe(512);
    expect(m.hasAlpha).toBe(true);
    const { data } = await sharp(h.isi).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0); // piksel pojok kiri atas tetap transparan
  });

  it("memutar sesuai EXIF lalu membuang metadata", async () => {
    const miring = await sharp(await jpeg(300, 200)).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const h = await kompresGambar(miring, "image/jpeg", "dokumen");
    const m = await sharp(h.isi).metadata();
    expect([m.width, m.height]).toEqual([200, 300]);
    expect(m.exif).toBeUndefined();
    expect(m.orientation).toBeUndefined();
  });

  it("gambar kecil tidak diperbesar", async () => {
    const h = await kompresGambar(await jpeg(400, 300), "image/jpeg", "dokumen");
    const m = await sharp(h.isi).metadata();
    expect([m.width, m.height]).toEqual([400, 300]);
  });

  it("gambar yang tidak bisa dibaca dikembalikan apa adanya", async () => {
    const rusak = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
    const h = await kompresGambar(rusak, "image/png", "dokumen");
    expect(h.isi.equals(rusak)).toBe(true);
    expect(h).toMatchObject({ mime: "image/png", ext: "png" });
  });

  it("PDF tidak diubah", async () => {
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF");
    const h = await kompresGambar(pdf, "application/pdf", "dokumen");
    expect(h.isi.equals(pdf)).toBe(true);
    expect(h).toMatchObject({ mime: "application/pdf", ext: "pdf" });
  });
});

describe("profilBerkas", () => {
  it("pas foto memakai profil pasFoto, berkas lain dokumen", () => {
    expect(profilBerkas("pas_foto")).toBe("pasFoto");
    expect(profilBerkas("akta")).toBe("dokumen");
    expect(profilBerkas("kustom_surat")).toBe("dokumen");
  });
});
