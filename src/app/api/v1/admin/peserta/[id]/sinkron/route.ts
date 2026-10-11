import { NextResponse } from "next/server";
import { sinkronBerkasPendaftar } from "@/server/actions/berkas";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../../../_lib/tangani";

/** Sinkron ulang berkas satu pendaftar ke Google Drive. */
export const POST = tangani(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return NextResponse.json(await sinkronBerkasPendaftar((await params).id, { userId: sesi.sub, ip }));
});
