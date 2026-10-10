import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { NAMA_COOKIE_ADMIN, opsiCookieAdmin } from "@/server/auth/sesi";
import { tangani } from "../../../_lib/tangani";

export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(NAMA_COOKIE_ADMIN, "", { ...opsiCookieAdmin(), maxAge: 0 });
  return res;
});
