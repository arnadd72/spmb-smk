import { prisma } from "@/server/db/client";
import { wajibDraf } from "@/server/services/draf";
import { GalatApi } from "@/server/types/galat";
import { skemaCatatOcr } from "@/server/validasi/ocr";

// Pencatatan OCR (PRD v4 11.5). Pembacaan terjadi di browser pendaftar; server hanya mencatat ringkasannya untuk
// statistik admin. Nilai hasil bacaan tidak pernah dikirim atau disimpan di sini.

export const NAMA_MESIN_OCR = "paddleocr";
/** Batas catatan per draf per jam, agar endpoint publik ini tidak bisa dipakai membanjiri tabel. */
export const MAKS_CATATAN_PER_JAM = 60;

export async function catatHasilOcr(token: string | undefined, input: unknown): Promise<void> {
  const baris = await wajibDraf(token);
  const hasil = skemaCatatOcr.safeParse(input);
  if (!hasil.success) throw GalatApi.validasi({ ocr: ["Catatan OCR tidak valid."] });
  const d = hasil.data;

  const sejam = new Date(Date.now() - 3600_000);
  const jumlah = await prisma.ocrHasil.count({ where: { draftId: baris.id, createdAt: { gte: sejam } } });
  if (jumlah >= MAKS_CATATAN_PER_JAM) throw GalatApi.terlaluBanyak();

  await prisma.ocrHasil.create({
    data: {
      draftId: baris.id,
      jenis: d.jenis,
      provider: NAMA_MESIN_OCR,
      fields: Object.fromEntries(Object.entries(d.keyakinan).map(([k, v]) => [k, v === "HIGH" || v === "MEDIUM"])),
      confidence: d.galat ? { ...d.keyakinan, _galat: d.galat } : d.keyakinan,
      durasiMs: d.durasiMs,
      sukses: d.sukses,
    },
  });
}
