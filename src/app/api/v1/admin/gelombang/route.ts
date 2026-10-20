import { NextResponse } from "next/server";
import { ambilGelombangAdmin, buatGelombang } from "@/server/actions/gelombang";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../_lib/tangani";
import { segarkanHalamanPublik } from "../../../_lib/konten";

export const GET = tangani(async () => {
  await wajibSesiAdmin(...PERAN.pendaftar);
  return NextResponse.json(await ambilGelombangAdmin());
});

export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const hasil = await buatGelombang(await req.json().catch(() => ({})), { userId: sesi.sub, ip });
  segarkanHalamanPublik();
  return NextResponse.json({ data: hasil }, { status: 201 });
});
