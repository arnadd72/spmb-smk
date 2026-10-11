import { NextResponse } from "next/server";
import { simpanBobot } from "@/server/actions/referensi";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../../../_lib/tangani";

/** Simpan bobot mata pelajaran satu jurusan (superadmin). Versi rekomendasi berubah; skor lama tidak. */
export const PUT = tangani(async (req: Request, { params }: { params: Promise<{ kode: string }> }) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.sistem);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return NextResponse.json({ data: await simpanBobot((await params).kode, await req.json().catch(() => ({})), { userId: sesi.sub, ip }) });
});
