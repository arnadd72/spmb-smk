import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { catatHasilOcr } from "@/server/services/ocr";
import { tokenDrafDariCookie } from "../../../_lib/draf";
import { tangani } from "../../../_lib/tangani";

/** Catat ringkasan satu pembacaan OCR (tanpa nilai hasil bacaan) untuk statistik admin. */
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  await catatHasilOcr(await tokenDrafDariCookie(), await req.json().catch(() => ({})));
  return new NextResponse(null, { status: 204 });
});
