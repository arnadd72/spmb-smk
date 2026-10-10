import { prisma } from "@/server/db/client";
import { dekripsi, enkripsi } from "@/server/services/kripto";

// Key-value pengaturan sistem. Nilai rahasia (refresh token Drive) lewat varian "Terenkripsi".

export async function ambilPengaturan(key: string): Promise<string | null> {
  const baris = await prisma.pengaturan.findUnique({ where: { key } });
  return baris?.value ?? null;
}

export async function simpanPengaturan(key: string, value: string): Promise<void> {
  await prisma.pengaturan.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function hapusPengaturan(key: string): Promise<void> {
  await prisma.pengaturan.deleteMany({ where: { key } });
}

export async function ambilPengaturanTerenkripsi(key: string): Promise<string | null> {
  const nilai = await ambilPengaturan(key);
  return nilai === null ? null : dekripsi(nilai);
}

export async function simpanPengaturanTerenkripsi(key: string, value: string): Promise<void> {
  await simpanPengaturan(key, enkripsi(value));
}
