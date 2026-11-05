// @vitest-environment node
import bcrypt from "bcryptjs";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loginAdmin } from "@/server/actions/loginAdmin";
import { prisma } from "@/server/db/client";
import { captchaAktif, periksaTurnstile, siteKeyTurnstile } from "@/server/services/turnstile";
import { GalatApi } from "@/server/types/galat";

// PRD 1.3 butir 86: captcha Turnstile di login admin. Cloudflare dipalsukan lewat fetch tiruan.
const PASSWORD = "PasswordUji-123";

function aktifkan() {
  process.env.TURNSTILE_SITE_KEY = "site-uji";
  process.env.TURNSTILE_SECRET_KEY = "rahasia-uji";
}

function palsukanCloudflare(jawab: () => Promise<Response> | Response) {
  const tiruan = vi.fn(async () => jawab());
  vi.stubGlobal("fetch", tiruan);
  return tiruan;
}

const lolos = () => Response.json({ success: true });
const ditolak = () => Response.json({ success: false, "error-codes": ["invalid-input-response"] });

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.TURNSTILE_SITE_KEY = "";
  process.env.TURNSTILE_SECRET_KEY = "";
});

describe("periksaTurnstile", () => {
  it("mati bila salah satu kunci kosong: selalu lolos tanpa memanggil Cloudflare", async () => {
    const f = palsukanCloudflare(lolos);
    process.env.TURNSTILE_SITE_KEY = "site-uji";
    expect(captchaAktif()).toBe(false);
    expect(siteKeyTurnstile()).toBeNull();
    expect(await periksaTurnstile(undefined)).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });

  it("aktif: token lolos mengirim secret, token, dan IP ke Cloudflare", async () => {
    aktifkan();
    const f = palsukanCloudflare(lolos);
    expect(siteKeyTurnstile()).toBe("site-uji");
    expect(await periksaTurnstile("token-baik", "10.0.0.1")).toBe(true);
    const [url, opsi] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const body = opsi.body as URLSearchParams;
    expect(body.get("secret")).toBe("rahasia-uji");
    expect(body.get("response")).toBe("token-baik");
    expect(body.get("remoteip")).toBe("10.0.0.1");
  });

  it("aktif: token kosong ditolak tanpa memanggil Cloudflare", async () => {
    aktifkan();
    const f = palsukanCloudflare(lolos);
    expect(await periksaTurnstile(undefined)).toBe(false);
    expect(await periksaTurnstile("")).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("aktif: ditolak Cloudflare, status bukan 200, galat jaringan, atau batas waktu menghasilkan false", async () => {
    aktifkan();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    palsukanCloudflare(ditolak);
    expect(await periksaTurnstile("t")).toBe(false);

    palsukanCloudflare(() => new Response("galat", { status: 500 }));
    expect(await periksaTurnstile("t")).toBe(false);

    palsukanCloudflare(() => Promise.reject(new Error("ECONNRESET")));
    expect(await periksaTurnstile("t")).toBe(false);

    vi.stubGlobal(
      "fetch",
      (_u: string, o: RequestInit) =>
        new Promise((_, tolak) => o.signal?.addEventListener("abort", () => tolak(new Error("aborted")))),
    );
    expect(await periksaTurnstile("t", undefined, 20)).toBe(false);
  });
});

describe("loginAdmin dengan captcha aktif", () => {
  beforeEach(async () => {
    await prisma.percobaanLogin.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: { name: "Petugas Uji", username: "budi", passwordHash: await bcrypt.hash(PASSWORD, 4), peran: "panitia" },
    });
  });

  afterAll(async () => {
    await prisma.percobaanLogin.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("tanpa token ditolak 400 CAPTCHA_GAGAL walau password benar, dan tidak menambah hitungan gagal", async () => {
    aktifkan();
    palsukanCloudflare(lolos);
    const g = (await loginAdmin({ username: "budi", password: PASSWORD }).catch((e) => e)) as GalatApi;
    expect(g).toBeInstanceOf(GalatApi);
    expect(g.status).toBe(400);
    expect(g.code).toBe("CAPTCHA_GAGAL");
    expect(await prisma.percobaanLogin.count()).toBe(0);
  });

  it("token ditolak Cloudflare juga 400", async () => {
    aktifkan();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    palsukanCloudflare(ditolak);
    const g = (await loginAdmin({ username: "budi", password: PASSWORD, captchaToken: "palsu" }).catch((e) => e)) as GalatApi;
    expect(g.code).toBe("CAPTCHA_GAGAL");
  });

  it("token lolos dan password benar: login berhasil", async () => {
    aktifkan();
    palsukanCloudflare(lolos);
    const hasil = await loginAdmin({ username: "budi", password: PASSWORD, captchaToken: "baik" });
    expect(hasil.user.nama).toBe("Petugas Uji");
  });

  it("token lolos tapi password salah tetap 401 seperti biasa", async () => {
    aktifkan();
    palsukanCloudflare(lolos);
    const g = (await loginAdmin({ username: "budi", password: "salah", captchaToken: "baik" }).catch((e) => e)) as GalatApi;
    expect(g.status).toBe(401);
  });

  it("captcha mati: login tanpa token tetap berhasil seperti sebelum fitur ini", async () => {
    const f = palsukanCloudflare(lolos);
    await expect(loginAdmin({ username: "budi", password: PASSWORD })).resolves.toBeDefined();
    expect(f).not.toHaveBeenCalled();
  });
});
