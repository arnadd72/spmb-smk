import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { jawabPertanyaan } from "@/server/services/tanyaPanitia";
import { tangani } from "../../_lib/tangani";

// Maksimal beberapa detik: Gemini dibatasi 9 detik di services/gemini.ts.
export const maxDuration = 30;

/** Tanya Sunan: aturan, FAQ, lalu Gemini bila perlu. Publik, dibatasi laju per IP. Tidak menyimpan teks pertanyaan. */
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const { pertanyaan, riwayat } = (await req.json().catch(() => ({}))) as { pertanyaan?: unknown; riwayat?: unknown };
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "tanpa-ip";
  return NextResponse.json(await jawabPertanyaan(pertanyaan, ip, riwayat), { headers: { "Cache-Control": "no-store" } });
});
