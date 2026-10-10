import { NextResponse } from "next/server";
import { loginAdmin } from "@/server/actions/loginAdmin";
import { periksaOrigin } from "@/server/auth/csrf";
import { NAMA_COOKIE_ADMIN, opsiCookieAdmin } from "@/server/auth/sesi";
import { skemaLogin } from "@/server/validasi/auth";
import { tangani } from "../../../_lib/tangani";

export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const input = skemaLogin.parse(await req.json().catch(() => ({})));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  const { token, user } = await loginAdmin(input, ip);

  const res = NextResponse.json({ user });
  res.cookies.set(NAMA_COOKIE_ADMIN, token, opsiCookieAdmin());
  return res;
});
