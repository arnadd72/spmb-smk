import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { simpanLangkah } from "@/server/services/draf";
import { tokenDrafDariCookie } from "../../../../_lib/draf";
import { tangani } from "../../../../_lib/tangani";

export const PUT = tangani(async (req: Request, ctx: RouteContext<"/api/v1/draf/langkah/[n]">) => {
  periksaOrigin(req);
  const { n } = await ctx.params;
  const hasil = await simpanLangkah(await tokenDrafDariCookie(), Number(n), await req.json().catch(() => ({})));
  return NextResponse.json(hasil);
});
