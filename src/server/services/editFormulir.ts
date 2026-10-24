import { jwtVerify, SignJWT } from "jose";
import { prisma } from "@/server/db/client";
import { fieldEdit, nilaiPendaftar, ubahPeserta } from "@/server/actions/peserta";
import { muatDefinisiField } from "@/server/services/draf";
import { GalatApi } from "@/server/types/galat";
import type { InputCekStatus } from "@/server/validasi/wizard";

export const NAMA_COOKIE_EDIT = "spmb_edit";
const MASA_SESI_DETIK = 30 * 60;
const BATAS_CEK_PER_MENIT = 10;

function rahasia(): Uint8Array {
  const nilai = process.env.JWT_SECRET;
  if (!nilai || nilai.length < 32) throw new Error("JWT_SECRET belum diisi atau kurang dari 32 karakter.");
  return new TextEncoder().encode(nilai);
}

export async function buatTokenEditFormulir(id: string): Promise<string> {
  return new SignJWT({ tujuan: "edit-formulir" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime(`${MASA_SESI_DETIK}s`)
    .sign(rahasia());
}

export async function bacaTokenEditFormulir(token?: string): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, rahasia(), { algorithms: ["HS256"] });
    if (payload.tujuan !== "edit-formulir" || !payload.sub || !/^\d{1,18}$/.test(payload.sub)) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export function opsiCookieEditFormulir() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MASA_SESI_DETIK,
  };
}

export async function verifikasiAksesEditFormulir(input: InputCekStatus, ip?: string): Promise<string> {
  const alamatIp = ip || "tanpa-ip";
  const penanda = `edit:${alamatIp}`;
  const sejak = new Date(Date.now() - 60_000);
  const percobaan = await prisma.percobaanLogin.count({ where: { username: penanda, createdAt: { gte: sejak } } });
  if (percobaan >= BATAS_CEK_PER_MENIT) throw GalatApi.terlaluBanyak("Terlalu banyak percobaan. Coba lagi satu menit lagi.");
  await prisma.percobaanLogin.create({ data: { username: penanda, ip: alamatIp, berhasil: false } });

  const pendaftar = await prisma.pendaftar.findUnique({
    where: { nomorPendaftaran: input.nomor.trim().toUpperCase() },
    select: { id: true, tanggalLahir: true },
  });
  const cocok = pendaftar?.tanggalLahir?.toISOString().slice(0, 10) === input.tanggalLahir;
  if (!pendaftar || !cocok) throw new GalatApi(404, "NOT_FOUND", "Nomor pendaftaran atau tanggal lahir tidak cocok.");
  return pendaftar.id.toString();
}

export async function ambilFormEditPublik(id: string) {
  const pendaftar = await prisma.pendaftar.findUnique({
    where: { id: BigInt(id) },
    include: { jurusan1: { select: { kode: true } }, jurusan2: { select: { kode: true } } },
  });
  if (!pendaftar) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");
  const fields = fieldEdit(await muatDefinisiField());
  const nilai = nilaiPendaftar(pendaftar as unknown as Record<string, unknown>, {
    j1: pendaftar.jurusan1?.kode,
    j2: pendaftar.jurusan2?.kode,
  });
  const catatan = pendaftar.statusVerifikasi === "rejected" ? pendaftar.catatanPenolakan : pendaftar.statusVerifikasi === "revision" ? pendaftar.catatanVerifikasi : null;
  return { nomor: pendaftar.nomorPendaftaran, fields, nilai, status: pendaftar.statusVerifikasi, catatan };
}

export async function simpanFormEditPublik(id: string, input: unknown, ip?: string) {
  return ubahPeserta(id, input, { ip, aksi: "pendaftar.ubah_publik" });
}
