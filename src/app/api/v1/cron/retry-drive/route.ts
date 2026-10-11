import { NextResponse } from "next/server";
import { ulangiSinkronDrive, periksaCron } from "@/server/services/cron";
import { tangani } from "../../../_lib/tangani";

// Dipanggil Vercel Cron (header Authorization: Bearer CRON_SECRET). Tidak untuk pengguna.
export const GET = tangani(async (req: Request) => {
  periksaCron(req);
  return NextResponse.json(await ulangiSinkronDrive());
});
