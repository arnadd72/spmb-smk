import { jwtVerify, SignJWT } from "jose";

// Sesi admin: JWT HS256 di cookie httpOnly "spmb_admin", berlaku 8 jam (PRD v4 7.5).
// File ini hanya urusan token. Pengambilan cookie dan pengecekan peran ada di verifikasiSesi.ts.

export const NAMA_COOKIE_ADMIN = "spmb_admin";
export const MASA_BERLAKU_DETIK = 8 * 60 * 60;

export type PeranAdmin = "superadmin" | "panitia" | "konten";

export type IsiSesi = {
  /** ID user (string, karena BigInt tidak bisa masuk JSON). */
  sub: string;
  peran: PeranAdmin;
  nama: string;
  /** Akun wajib ganti password (mustChangePassword): semua rute selain ganti password ditolak sampai diganti. */
  mcp?: boolean;
};

const PERAN_VALID: PeranAdmin[] = ["superadmin", "panitia", "konten"];

function rahasia(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET belum diisi atau kurang dari 32 karakter.");
  return new TextEncoder().encode(s);
}

export async function buatToken(isi: IsiSesi): Promise<string> {
  return new SignJWT({ peran: isi.peran, nama: isi.nama, ...(isi.mcp ? { mcp: true } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(isi.sub)
    .setIssuedAt()
    .setExpirationTime(`${MASA_BERLAKU_DETIK}s`)
    .sign(rahasia());
}

/** Mengembalikan isi sesi bila token sah dan belum kedaluwarsa, selain itu null. */
export async function bacaToken(token: string | undefined): Promise<IsiSesi | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, rahasia(), { algorithms: ["HS256"] });
    const peran = payload.peran as PeranAdmin;
    if (!payload.sub || !PERAN_VALID.includes(peran)) return null;
    return { sub: payload.sub, peran, nama: String(payload.nama ?? ""), mcp: payload.mcp === true };
  } catch {
    return null;
  }
}

export function opsiCookieAdmin() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MASA_BERLAKU_DETIK,
  };
}
