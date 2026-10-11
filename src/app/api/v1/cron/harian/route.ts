import { NextResponse } from "next/server";
import { jalankanHarian, periksaCron } from "@/server/services/cron";
import { tangani } from "../../../_lib/tangani";

// Dipanggil Vercel Cron (header Authorization: Bearer CRON_SECRET). Tidak untuk pengguna.
// Sinkron Drive bisa lama bila banyak berkas.
export const maxDuration = 300;

export const GET = tangani(async (req: Request) => {
  periksaCron(req);
  return NextResponse.json(await jalankanHarian());
});
