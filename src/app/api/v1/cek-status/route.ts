import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { cekStatus } from "@/server/services/pendaftaran";
import { skemaCekStatus } from "@/server/validasi/wizard";
import { ipDariRequest } from "../../_lib/draf";
import { tangani } from "../../_lib/tangani";

export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const input = skemaCekStatus.parse(await req.json().catch(() => ({})));
  return NextResponse.json(await cekStatus(input, ipDariRequest(req)));
});
