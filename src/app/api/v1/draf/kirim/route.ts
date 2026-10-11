import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { NAMA_COOKIE_DRAF } from "@/server/services/draf";
import { kirimPendaftaran } from "@/server/services/pendaftaran";
import { tokenDrafDariCookie } from "../../../_lib/draf";
import { tangani } from "../../../_lib/tangani";

export const maxDuration = 60;

export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const { konfirmasi_final } = (await req.json().catch(() => ({}))) as { konfirmasi_final?: unknown };
  const hasil = await kirimPendaftaran(await tokenDrafDariCookie(), konfirmasi_final);
  const res = NextResponse.json(hasil);
  res.cookies.delete(NAMA_COOKIE_DRAF);
  return res;
});
