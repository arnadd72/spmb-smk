import { NextResponse } from "next/server";
import { periksaCron } from "@/server/services/cron";
import { kirimUlangEmailTertunda } from "@/server/services/notifikasi";
import { tangani } from "../../../_lib/tangani";

export const GET = tangani(async (req: Request) => {
  periksaCron(req);
  return NextResponse.json(await kirimUlangEmailTertunda());
});
