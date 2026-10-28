import { NextResponse } from "next/server";
import { geserSoalMinat } from "@/server/actions/konten";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { segarkanHalamanPublik } from "../../../../../_lib/konten";
import { tangani } from "../../../../../_lib/tangani";

/** Geser satu soal naik atau turun satu posisi. Peran: konten dan superadmin. */
export const POST = tangani(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.konten);
  await geserSoalMinat((await params).id, await req.json().catch(() => ({})), { userId: sesi.sub, ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() });
  segarkanHalamanPublik();
  return new NextResponse(null, { status: 204 });
});
