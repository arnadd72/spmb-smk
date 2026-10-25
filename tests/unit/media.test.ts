// @vitest-environment node
import { Readable } from "node:stream";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Drive tiruan di memori untuk foto web (poin B): berkas, folder, dan tanda publik bisa diperiksa per test.
const drive = vi.hoisted(() => ({
  terhubung: true,
  berkas: new Map<string, { nama: string; parents: string[]; mimeType: string; isi: Buffer; appProperties?: Record<string, string>; trashed?: boolean }>(),
  n: 0,
}));

vi.mock("@/server/services/penyimpanan/driveOAuth", async (asli) => {
  const klien = {
    files: {
      list: async ({ q }: { q: string }) => {
        const nama = /name = '([^']+)'/.exec(q)?.[1];
        const induk = /'([^']+)' in parents/.exec(q)?.[1];
        const ada = [...drive.berkas.entries()].find(([, b]) => b.nama === nama && b.parents.includes(induk ?? "") && b.mimeType.endsWith("folder"));
        return { data: { files: ada ? [{ id: ada[0] }] : [] } };
      },
      create: async ({ requestBody, media }: { requestBody: { name: string; parents: string[]; mimeType?: string; appProperties?: Record<string, string> }; media?: { mimeType: string; body: Readable } }) => {
        const id = `id${String(++drive.n).padStart(12, "0")}`;
        const bagian: Buffer[] = [];
        if (media) for await (const b of media.body) bagian.push(Buffer.from(b));
        drive.berkas.set(id, {
          nama: requestBody.name,
          parents: requestBody.parents,
          mimeType: requestBody.mimeType ?? media?.mimeType ?? "application/octet-stream",
          isi: Buffer.concat(bagian),
          appProperties: requestBody.appProperties,
        });
        return { data: { id } };
      },
      get: async ({ fileId, alt }: { fileId: string; alt?: string }) => {
        const b = drive.berkas.get(fileId);
        if (!b) throw Object.assign(new Error("File not found"), { code: 404 });
        if (alt === "media") return { data: Readable.from(b.isi) };
        return { data: { id: fileId, mimeType: b.mimeType, trashed: b.trashed ?? false, appProperties: b.appProperties } };
      },
      delete: async ({ fileId }: { fileId: string }) => void drive.berkas.delete(fileId),
    },
  };
  return {
    ...(await asli<typeof import("@/server/services/penyimpanan/driveOAuth")>()),
    statusDrive: async () => ({ terhubung: drive.terhubung, email: null, adaKredensial: true }),
    klienDrive: async () => {
      if (!drive.terhubung) throw new Error("Google Drive belum dihubungkan.");
      return klien;
    },
    idFolderRoot: async () => "root",
  };
});

import { bacaKategoriMedia, bukaMediaPublik, hapusMediaBila, simpanMedia } from "@/server/services/media";
import type { GalatApi } from "@/server/types/galat";

const jpeg = () => sharp({ create: { width: 2400, height: 1200, channels: 3, background: { r: 10, g: 120, b: 90 } } }).jpeg().toBuffer();

async function galat(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e as GalatApi;
  }
  throw new Error("Seharusnya melempar galat.");
}

/** Path folder berkas di Drive tiruan, dari root ke berkas itu sendiri. */
function pathBerkas(id: string): string {
  const b = drive.berkas.get(id)!;
  const induk = b.parents[0];
  return induk === "root" ? b.nama : `${pathBerkas(induk)}/${b.nama}`;
}

const idDari = (url: string) => url.slice("/api/v1/media/".length);

beforeEach(() => {
  drive.terhubung = true;
  drive.berkas.clear();
  drive.n = 0;
});
afterEach(() => vi.unstubAllEnvs());

describe("simpanMedia ke Google Drive", () => {
  it("menyimpan WebP terkompres di situs/{kategori}/ dengan tanda publik", async () => {
    const url = await simpanMedia(await jpeg(), "galeri");
    expect(url).toMatch(/^\/api\/v1\/media\/[A-Za-z0-9_-]+$/);
    const id = idDari(url);
    expect(pathBerkas(id)).toMatch(/^situs\/galeri\/\d{4}-\d{2}-[A-Za-z0-9_-]+\.webp$/);
    const b = drive.berkas.get(id)!;
    expect(b.appProperties).toEqual({ spmb: "publik" });
    expect(b.mimeType).toBe("image/webp");
    expect((await sharp(b.isi).metadata()).width).toBe(1600);
  });

  it("kategori logo memakai profil logo (maks 512 px)", async () => {
    const url = await simpanMedia(await jpeg(), "logo");
    const b = drive.berkas.get(idDari(url))!;
    expect(pathBerkas(idDari(url))).toMatch(/^situs\/logo\//);
    expect((await sharp(b.isi).metadata()).width).toBe(512);
  });

  it("di produksi tanpa Drive ditolak 503 dengan pesan yang jelas", async () => {
    drive.terhubung = false;
    vi.stubEnv("NODE_ENV", "production");
    const e = await galat(simpanMedia(await jpeg(), "berita"));
    expect(e.status).toBe(503);
    expect(e.message).toBe("Google Drive belum terhubung. Hubungkan dari menu Pengaturan.");
  });

  it("kategori yang tidak dikenal ditolak sebagai galat validasi", async () => {
    expect((await galat(Promise.resolve().then(() => bacaKategoriMedia("lainnya")))).status).toBe(422);
    expect((await galat(Promise.resolve().then(() => bacaKategoriMedia(undefined)))).status).toBe(422);
    expect(bacaKategoriMedia("testimoni")).toBe("testimoni");
  });
});

describe("bukaMediaPublik", () => {
  it("mengalirkan berkas bertanda publik", async () => {
    const url = await simpanMedia(await jpeg(), "hero");
    const hasil = await bukaMediaPublik(idDari(url));
    expect(hasil?.mime).toBe("image/webp");
    const bagian: Buffer[] = [];
    for await (const b of hasil!.aliran) bagian.push(Buffer.from(b));
    expect(Buffer.concat(bagian).equals(drive.berkas.get(idDari(url))!.isi)).toBe(true);
  });

  it("berkas tanpa tanda publik, terhapus, tidak ada, atau ID tidak sah: null", async () => {
    drive.berkas.set("dokumenKKrahasia01", { nama: "kk.jpg", parents: ["root"], mimeType: "image/jpeg", isi: Buffer.from("kk") });
    expect(await bukaMediaPublik("dokumenKKrahasia01")).toBeNull();

    const url = await simpanMedia(await jpeg(), "hero");
    drive.berkas.get(idDari(url))!.trashed = true;
    expect(await bukaMediaPublik(idDari(url))).toBeNull();

    expect(await bukaMediaPublik("tidakAdaSamaSekali")).toBeNull();
    expect(await bukaMediaPublik("../x")).toBeNull();
  });

  it("berkas publik selain gambar tidak dikirim", async () => {
    drive.berkas.set("pdfPublikSaja0001", { nama: "x.pdf", parents: ["root"], mimeType: "application/pdf", isi: Buffer.from("%PDF"), appProperties: { spmb: "publik" } });
    expect(await bukaMediaPublik("pdfPublikSaja0001")).toBeNull();
  });
});

describe("hapusMediaBila untuk rujukan Drive", () => {
  it("menghapus berkas publik", async () => {
    const url = await simpanMedia(await jpeg(), "testimoni");
    await hapusMediaBila(url);
    expect(drive.berkas.has(idDari(url))).toBe(false);
  });

  it("tidak pernah menghapus berkas Drive tanpa tanda publik", async () => {
    drive.berkas.set("dokumenKKrahasia01", { nama: "kk.jpg", parents: ["root"], mimeType: "image/jpeg", isi: Buffer.from("kk") });
    await hapusMediaBila("/api/v1/media/dokumenKKrahasia01");
    expect(drive.berkas.has("dokumenKKrahasia01")).toBe(true);
  });
});

describe("GET /api/v1/media/[id]", () => {
  const minta = async (id: string) => {
    const { GET } = await import("@/app/api/v1/media/[id]/route");
    return GET(new Request(`http://localhost/api/v1/media/${encodeURIComponent(id)}`), { params: Promise.resolve({ id }) });
  };

  it("mengirim foto publik dengan cache satu tahun dan nosniff", async () => {
    const url = await simpanMedia(await jpeg(), "galeri");
    const res = await minta(idDari(url));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(Buffer.from(await res.arrayBuffer()).equals(drive.berkas.get(idDari(url))!.isi)).toBe(true);
  });

  it("dokumen, berkas terhapus, ID tidak ada, ID tidak sah, dan PDF publik: 404 yang sama", async () => {
    drive.berkas.set("dokumenKKrahasia01", { nama: "kk.jpg", parents: ["root"], mimeType: "image/jpeg", isi: Buffer.from("kk") });
    drive.berkas.set("pdfPublikSaja0001", { nama: "x.pdf", parents: ["root"], mimeType: "application/pdf", isi: Buffer.from("%PDF"), appProperties: { spmb: "publik" } });
    const terhapus = idDari(await simpanMedia(await jpeg(), "hero"));
    drive.berkas.get(terhapus)!.trashed = true;

    const jawaban = await Promise.all(["dokumenKKrahasia01", terhapus, "tidakAdaSamaSekali", "../x", "pdfPublikSaja0001"].map(minta));
    expect(jawaban.map((r) => r.status)).toEqual([404, 404, 404, 404, 404]);
    const isi = await Promise.all(jawaban.map((r) => r.text()));
    expect(new Set(isi).size).toBe(1);
  });
});
