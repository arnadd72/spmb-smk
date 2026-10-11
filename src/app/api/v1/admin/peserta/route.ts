import { NextResponse } from "next/server";
import { buatPendaftarManual } from "@/server/actions/inputManual";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../_lib/tangani";

/** Input manual pendaftar luring (sumber = luring, nomor dari generator yang sama dengan wizard). */
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const hasil = await buatPendaftarManual(await req.json().catch(() => ({})), { userId: sesi.sub, ip });
  return NextResponse.json(hasil, { status: 201 });
});
