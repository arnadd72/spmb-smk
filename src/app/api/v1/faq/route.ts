import { prisma } from "@/server/db/client";
import { jsonPublik } from "../../_lib/publik";
import { tangani } from "../../_lib/tangani";

/** Semua FAQ aktif. Pencarian Tanya Panitia (A8) memakai data yang sama. Kata kunci internal tidak dikirim. */
export const GET = tangani(async () => {
  const data = await prisma.faq.findMany({ where: { isActive: true }, orderBy: [{ urutan: "asc" }, { id: "asc" }] });
  return jsonPublik({ data: data.map((f) => ({ id: f.id.toString(), pertanyaan: f.pertanyaan, jawaban: f.jawaban })) });
});
