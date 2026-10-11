// @vitest-environment node
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { bacaToken, buatToken } from "@/server/auth/sesi";

describe("sesi admin (JWT)", () => {
  it("token yang dibuat bisa dibaca kembali", async () => {
    const token = await buatToken({ sub: "7", peran: "panitia", nama: "Budi" });
    expect(await bacaToken(token)).toEqual({ sub: "7", peran: "panitia", nama: "Budi", mcp: false });
  });

  it("tanpa token atau token sampah menghasilkan null", async () => {
    expect(await bacaToken(undefined)).toBeNull();
    expect(await bacaToken("")).toBeNull();
    expect(await bacaToken("bukan.jwt.sah")).toBeNull();
  });

  it("token yang ditandatangani rahasia lain ditolak", async () => {
    const palsu = await new SignJWT({ peran: "superadmin", nama: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("1")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("rahasia-lain-yang-juga-panjang-sekali-32+"));
    expect(await bacaToken(palsu)).toBeNull();
  });

  it("token kedaluwarsa ditolak", async () => {
    const lama = await new SignJWT({ peran: "panitia", nama: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("1")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));
    expect(await bacaToken(lama)).toBeNull();
  });

  it("peran di luar daftar ditolak", async () => {
    const aneh = await new SignJWT({ peran: "dewa", nama: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("1")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));
    expect(await bacaToken(aneh)).toBeNull();
  });
});
