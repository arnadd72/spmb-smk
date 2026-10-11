import { prisma } from "@/server/db/client";
import { cariFaq } from "@/server/services/tanyaPanitia";
import { jsonPublik } from "../../_lib/publik";
import { tangani } from "../../_lib/tangani";

/**
 * Semua FAQ aktif, atau `?q=` untuk mencari yang paling mirip (Jaccard, tanpa AI), maksimal tiga.
 * Kata kunci internal tidak dikirim.
 */
export const GET = tangani(async (req: Request) => {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 300);
  if (q) return jsonPublik({ data: await cariFaq(q) }, { detik: 30 });

  const data = await prisma.faq.findMany({ where: { isActive: true }, orderBy: [{ urutan: "asc" }, { id: "asc" }] });
  return jsonPublik({ data: data.map((f) => ({ id: f.id.toString(), pertanyaan: f.pertanyaan, jawaban: f.jawaban })) });
});
