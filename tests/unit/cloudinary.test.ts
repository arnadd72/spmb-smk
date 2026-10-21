import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hapusGambarCloudinary, publicIdDariUrl, tandaTangan, unggahGambar, urlPublik, urlTerautentikasi } from "@/server/services/cloudinary";
import { hapusMediaBila, simpanMedia } from "@/server/services/media";

const K = { cloud: "demo", kunci: "kunci-uji", rahasia: "rahasia-uji" };
// JPEG minimal: cukup untuk deteksi tipe dari byte.
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 1)]);

describe("tanda tangan Cloudinary", () => {
  it("cocok dengan contoh baku di dokumentasi Cloudinary", () => {
    const sig = tandaTangan({ eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: "1315060510" }, "abcd");
    expect(sig).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("mengurutkan parameter dan membuang yang kosong", () => {
    expect(tandaTangan({ b: "2", a: "1", c: "" }, "x")).toBe(tandaTangan({ a: "1", b: "2" }, "x"));
  });
});

describe("URL Cloudinary", () => {
  it("URL publik memuat f_auto,q_auto dan bisa dibalik ke public_id", () => {
    const url = urlPublik("demo", "spmb/konten/2026/10/abc");
    expect(url).toBe("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/spmb/konten/2026/10/abc");
    expect(publicIdDariUrl(url, "demo")).toBe("spmb/konten/2026/10/abc");
  });

  it("menolak URL akun lain, alamat luar, dan path traversal", () => {
    expect(publicIdDariUrl(urlPublik("lain", "x/y"), "demo")).toBeNull();
    expect(publicIdDariUrl("https://contoh.com/a.jpg", "demo")).toBeNull();
    expect(publicIdDariUrl("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/../rahasia", "demo")).toBeNull();
  });

  it("URL terautentikasi memakai segmen tanda tangan s--8 karakter--", () => {
    const url = urlTerautentikasi(K, "spmb/pasfoto/abc");
    expect(url).toMatch(/^https:\/\/res\.cloudinary\.com\/demo\/image\/authenticated\/s--[A-Za-z0-9_-]{8}--\/spmb\/pasfoto\/abc$/);
    expect(urlTerautentikasi(K, "spmb/pasfoto/abc")).toBe(url);
    expect(urlTerautentikasi({ ...K, rahasia: "lain" }, "spmb/pasfoto/abc")).not.toBe(url);
  });
});

describe("unggah dan hapus lewat REST", () => {
  const fetchPalsu = vi.fn();
  beforeEach(() => vi.stubGlobal("fetch", fetchPalsu));
  afterEach(() => {
    fetchPalsu.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("mengirim multipart bertanda tangan ke endpoint upload dan mengembalikan public_id", async () => {
    fetchPalsu.mockResolvedValue(new Response(JSON.stringify({ public_id: "spmb/x/1" }), { status: 200 }));
    const id = await unggahGambar(K, JPEG, "image/jpeg", { publicId: "spmb/x/1", akses: "authenticated" });
    expect(id).toBe("spmb/x/1");

    const [url, init] = fetchPalsu.mock.calls[0] as [string, { method: string; body: FormData }];
    expect(url).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
    expect(init.method).toBe("POST");
    const form = init.body;
    expect(form.get("api_key")).toBe("kunci-uji");
    expect(form.get("type")).toBe("authenticated");
    expect(form.get("transformation")).toBe("c_limit,w_1600,h_1600,q_auto:good");
    expect(form.get("file")).toBeInstanceOf(Blob);
    // Tanda tangan dihitung dari semua parameter kecuali file, api_key, dan signature, dan rahasia tidak ikut terkirim.
    const param: Record<string, string> = {};
    for (const [k, v] of form.entries()) if (typeof v === "string" && !["api_key", "signature"].includes(k)) param[k] = v;
    expect(form.get("signature")).toBe(tandaTangan(param, K.rahasia));
    expect([...form.values()].some((v) => v === K.rahasia)).toBe(false);
  });

  it("melempar galat berisi pesan Cloudinary saat unggah ditolak", async () => {
    fetchPalsu.mockResolvedValue(new Response(JSON.stringify({ error: { message: "Invalid Signature" } }), { status: 401 }));
    await expect(unggahGambar(K, JPEG, "image/jpeg", { publicId: "a", akses: "public" })).rejects.toThrow(/401.*Invalid Signature/);
  });

  it("hapus memanggil endpoint destroy dengan public_id", async () => {
    fetchPalsu.mockResolvedValue(new Response(JSON.stringify({ result: "ok" }), { status: 200 }));
    await hapusGambarCloudinary(K, "spmb/x/1");
    const [url, init] = fetchPalsu.mock.calls[0] as [string, { body: FormData }];
    expect(url).toBe("https://api.cloudinary.com/v1_1/demo/image/destroy");
    expect(init.body.get("public_id")).toBe("spmb/x/1");
  });

  it("simpanMedia memakai Cloudinary bila dikonfigurasi dan mengembalikan URL f_auto,q_auto", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", K.cloud);
    vi.stubEnv("CLOUDINARY_API_KEY", K.kunci);
    vi.stubEnv("CLOUDINARY_API_SECRET", K.rahasia);
    fetchPalsu.mockImplementation(async (_u: string, init: { body: FormData }) => new Response(JSON.stringify({ public_id: init.body.get("public_id") }), { status: 200 }));

    const url = await simpanMedia(JPEG);
    expect(url).toMatch(/^https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/f_auto,q_auto\/spmb\/konten\/\d{4}\/\d{2}\/[A-Za-z0-9_-]+$/);
  });

  it("hapusMediaBila menghapus gambar Cloudinary miliknya dan mengabaikan alamat luar", async () => {
    vi.stubEnv("CLOUDINARY_CLOUD_NAME", K.cloud);
    vi.stubEnv("CLOUDINARY_API_KEY", K.kunci);
    vi.stubEnv("CLOUDINARY_API_SECRET", K.rahasia);
    fetchPalsu.mockResolvedValue(new Response(JSON.stringify({ result: "ok" }), { status: 200 }));

    await hapusMediaBila(urlPublik(K.cloud, "spmb/konten/2026/10/abc"));
    expect(fetchPalsu).toHaveBeenCalledTimes(1);
    expect((fetchPalsu.mock.calls[0][1] as { body: FormData }).body.get("public_id")).toBe("spmb/konten/2026/10/abc");

    await hapusMediaBila("https://contoh.com/foto.jpg");
    expect(fetchPalsu).toHaveBeenCalledTimes(1);
  });
});
