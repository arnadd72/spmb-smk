import { NextResponse } from "next/server";
import { periksaNilai } from "@/server/actions/verifikasi";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../../../_lib/tangani";

/** "Nilai sesuai" atau koreksi nilai rapor (rekomendasi dihitung ulang). */
export const POST = tangani(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return NextResponse.json(await periksaNilai((await params).id, await req.json().catch(() => ({})), { userId: sesi.sub, ip }));
});
