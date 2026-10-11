import { NextResponse } from "next/server";
import { ambilMataPelajaran } from "@/server/actions/ambilReferensi";
import { buatMapel } from "@/server/actions/referensi";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../_lib/tangani";

export const GET = tangani(async () => {
  await wajibSesiAdmin(...PERAN.referensi);
  return NextResponse.json({ data: await ambilMataPelajaran() });
});

export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.sistem);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return NextResponse.json({ data: await buatMapel(await req.json().catch(() => ({})), { userId: sesi.sub, ip }) }, { status: 201 });
});
