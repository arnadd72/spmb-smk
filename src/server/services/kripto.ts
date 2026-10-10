import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// AES-256-GCM untuk data sensitif (NIK, no KK, no HP, refresh token Drive). PRD v4 Bagian 8 dan 17.
// Format tersimpan: "v1:<iv>.<tag>.<cipher>" (base64url), jadi versi kunci bisa diganti kelak.

const VERSI = "v1";

function kunci(): Buffer {
  const mentah = process.env.ENCRYPTION_KEY;
  if (!mentah) throw new Error("ENCRYPTION_KEY belum diisi.");

  // Terima 64 karakter hex atau base64 dari 32 byte.
  const buf = /^[0-9a-fA-F]{64}$/.test(mentah) ? Buffer.from(mentah, "hex") : Buffer.from(mentah, "base64");
  if (buf.length !== 32) throw new Error("ENCRYPTION_KEY harus 32 byte (64 hex atau base64).");
  return buf;
}

export function enkripsi(teks: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", kunci(), iv);
  const isi = Buffer.concat([cipher.update(teks, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSI}:${iv.toString("base64url")}.${tag.toString("base64url")}.${isi.toString("base64url")}`;
}

export function dekripsi(terenkripsi: string): string {
  const [versi, badan] = terenkripsi.split(":");
  if (versi !== VERSI || !badan) throw new Error("Format data terenkripsi tidak dikenal.");

  const [iv, tag, isi] = badan.split(".");
  if (!iv || !tag || !isi) throw new Error("Format data terenkripsi rusak.");

  const decipher = createDecipheriv("aes-256-gcm", kunci(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(isi, "base64url")), decipher.final()]).toString("utf8");
}

/** Hash deterministik untuk pencarian (mis. nikHash). Berbeda dari enkripsi: tidak bisa dibalik. */
export function hashPencarian(nilai: string): string {
  return createHmac("sha256", kunci()).update(nilai.trim().toLowerCase()).digest("hex");
}

/** SHA-256 untuk token acak (draf, akses sukses). Token asli tidak pernah disimpan. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buatTokenAcak(panjang = 40): string {
  // base64url dari byte acak, dipotong ke panjang yang diminta.
  return randomBytes(Math.ceil((panjang * 3) / 4)).toString("base64url").slice(0, panjang);
}

export function samaAmanWaktu(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
