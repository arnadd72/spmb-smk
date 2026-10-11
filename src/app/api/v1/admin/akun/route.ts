import { NextResponse } from "next/server";
import { buatAkun, daftarAkun } from "@/server/actions/akun";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../_lib/tangani";

export const GET = tangani(async () => {
  await wajibSesiAdmin(...PERAN.sistem);
  return NextResponse.json({ data: await daftarAkun() });
});

/** Buat akun dengan password sementara (ditampilkan sekali dalam respons ini). */
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.sistem);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const hasil = await buatAkun(await req.json().catch(() => ({})), { userId: sesi.sub, ip });
  return NextResponse.json(hasil, { status: 201, headers: { "Cache-Control": "no-store" } });
});
