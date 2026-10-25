// @vitest-environment node
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hapusGambarCloudinary } from "@/server/services/cloudinary";
import { penyimpananTemp } from "@/server/services/penyimpanan";
import { AWALAN_REF_CLOUDINARY, DriverCloudinary, adalahRefCloudinary } from "@/server/services/penyimpanan/driverCloudinary";

const K = { cloud: "demo", kunci: "kunci-uji", rahasia: "rahasia-uji" };
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 9)]);
const ok = (badan: unknown) => new Response(JSON.stringify(badan), { status: 200 });
const bagian = (res: unknown) => (res as [string, { body: FormData }]);

describe("DriverCloudinary", () => {
  const fetchPalsu = vi.fn();
  beforeEach(() => vi.stubGlobal("fetch", fetchPalsu));
  afterEach(() => {
    fetchPalsu.mockReset();
    vi.unstubAllGlobals();
  });

  it("menyimpan sebagai gambar terautentikasi dan mengembalikan rujukan berawalan cld:", async () => {
    fetchPalsu.mockResolvedValue(ok({ public_id: "spmb/pas-foto/12/pas_foto-ab" }));
    const ref = await new DriverCloudinary(K).simpan("12/pas_foto-ab.png", PNG, "image/png");

    expect(ref).toBe(`${AWALAN_REF_CLOUDINARY}spmb/pas-foto/12/pas_foto-ab`);
    expect(adalahRefCloudinary(ref)).toBe(true);
    const [, init] = bagian(fetchPalsu.mock.calls[0]);
    expect(init.body.get("type")).toBe("authenticated");
    expect(init.body.get("public_id")).toBe("spmb/pas-foto/12/pas_foto-ab");
    expect(init.body.get("transformation")).toContain("c_limit");
  });

  it("membaca lewat URL bertanda tangan, bukan URL terbuka", async () => {
    fetchPalsu.mockResolvedValue(new Response(PNG, { status: 200 }));
    const aliran = await new DriverCloudinary(K).ambilStream(`${AWALAN_REF_CLOUDINARY}spmb/pas-foto/12/pas_foto-ab`);
    const potongan: Buffer[] = [];
    for await (const c of aliran) potongan.push(Buffer.from(c));

    expect(Buffer.concat(potongan).equals(PNG)).toBe(true);
    expect(fetchPalsu.mock.calls[0][0]).toMatch(/\/image\/authenticated\/s--[A-Za-z0-9_-]{8}--\/spmb\/pas-foto\/12\/pas_foto-ab$/);
  });

  it("ada() mengikuti status HTTP, dan galat bila gambar tidak bisa diambil", async () => {
    const d = new DriverCloudinary(K);
    fetchPalsu.mockResolvedValueOnce(new Response(null, { status: 200 })).mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect(await d.ada(`${AWALAN_REF_CLOUDINARY}a/b`)).toBe(true);
    expect(await d.ada(`${AWALAN_REF_CLOUDINARY}a/b`)).toBe(false);

    fetchPalsu.mockResolvedValueOnce(new Response("tidak ada", { status: 404 }));
    await expect(d.ambilStream(`${AWALAN_REF_CLOUDINARY}a/b`)).rejects.toThrow(/404/);
  });

  it("menolak rujukan milik penyimpanan lain dan path traversal", async () => {
    const d = new DriverCloudinary(K);
    await expect(d.ambilStream("12/pas_foto-ab.png")).rejects.toThrow(/bukan milik Cloudinary/);
    await expect(d.hapus(`${AWALAN_REF_CLOUDINARY}../rahasia`)).rejects.toThrow();
    await expect(d.simpan("a/../b.png", PNG, "image/png")).rejects.toThrow(/tidak valid/);
    expect(fetchPalsu).not.toHaveBeenCalled();
  });

  it("hapus gagal bila Cloudinary tidak menghapus, tetapi 'not found' dianggap sudah terhapus", async () => {
    fetchPalsu.mockResolvedValueOnce(ok({ result: "not found" }));
    await expect(hapusGambarCloudinary(K, "a/b", "authenticated")).resolves.toBeUndefined();
    fetchPalsu.mockResolvedValueOnce(ok({ result: "error" }));
    await expect(hapusGambarCloudinary(K, "a/b", "authenticated")).rejects.toThrow(/tidak menghapus/);
  });
});

describe("penyimpananTemp dengan Cloudinary terpasang", () => {
  const fetchPalsu = vi.fn();
  let folder: string;

  beforeEach(async () => {
    folder = await mkdtemp(path.join(os.tmpdir(), "spmb-temp-"));
    vi.stubGlobal("fetch", fetchPalsu);
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", K.cloud);
    vi.stubEnv("CLOUDINARY_API_KEY", K.kunci);
    vi.stubEnv("CLOUDINARY_API_SECRET", K.rahasia);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("DRAF_TEMP_DIR", folder);
  });
  afterEach(async () => {
    fetchPalsu.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    await rm(folder, { recursive: true, force: true });
  });

  it("pas foto baru tidak lagi masuk Cloudinary: semua unggahan ke penyimpanan lama (poin B)", async () => {
    const temp = penyimpananTemp();

    const refFoto = await temp.simpan("77/pas_foto-xyz.png", PNG, "image/png");
    expect(adalahRefCloudinary(refFoto)).toBe(false);
    const refLain = await temp.simpan("77/kustom_surat-xyz.png", PNG, "image/png");
    expect(adalahRefCloudinary(refLain)).toBe(false);
    expect(fetchPalsu).not.toHaveBeenCalled();
    expect(await readdir(folder)).toContain("77");
  });

  it("rujukan lama tetap terbaca dan terhapus lewat penyimpanan lama, rujukan cld: lewat Cloudinary", async () => {
    const temp = penyimpananTemp();
    const refLama = await temp.simpan("88/kustom_dok-1.png", PNG, "image/png");
    expect(await temp.ada(refLama)).toBe(true);
    await temp.hapus(refLama);
    expect(await temp.ada(refLama)).toBe(false);
    expect(fetchPalsu).not.toHaveBeenCalled();

    fetchPalsu.mockResolvedValue(ok({ result: "ok" }));
    await temp.hapus(`${AWALAN_REF_CLOUDINARY}spmb/pas-foto/88/pas_foto-1`);
    expect(fetchPalsu.mock.calls[0][0]).toBe("https://api.cloudinary.com/v1_1/demo/image/destroy");
  });

  it("tanpa Cloudinary, pas foto tetap memakai penyimpanan lama seperti sebelumnya", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", "");
    vi.stubEnv("CLOUDINARY_API_KEY", "");
    vi.stubEnv("CLOUDINARY_API_SECRET", "");
    const ref = await penyimpananTemp().simpan("99/pas_foto-q.png", PNG, "image/png");
    expect(adalahRefCloudinary(ref)).toBe(false);
    expect(fetchPalsu).not.toHaveBeenCalled();
  });
});
