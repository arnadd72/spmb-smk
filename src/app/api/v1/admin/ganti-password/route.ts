import { NextResponse } from "next/server";
import { gantiPassword } from "@/server/actions/gantiPassword";
import { periksaOrigin } from "@/server/auth/csrf";
import { NAMA_COOKIE_ADMIN, opsiCookieAdmin } from "@/server/auth/sesi";
import { ambilSesiAdmin } from "@/server/auth/verifikasiSesi";
import { GalatApi } from "@/server/types/galat";
import { tangani } from "../../../_lib/tangani";

// Satu-satunya rute admin yang boleh diakses akun berstatus wajib ganti password.
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const sesi = await ambilSesiAdmin();
  if (!sesi) throw GalatApi.tidakTerautentikasi();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  const { token } = await gantiPassword(sesi, await req.json().catch(() => ({})), ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(NAMA_COOKIE_ADMIN, token, opsiCookieAdmin());
  return res;
});
