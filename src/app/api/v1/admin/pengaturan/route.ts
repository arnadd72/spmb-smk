import { NextResponse } from "next/server";
import { ambilSemuaPengaturan, simpanPengaturanAdmin } from "@/server/actions/pengaturan";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../_lib/tangani";
import { segarkanHalamanPublik } from "../../../_lib/konten";

export const GET = tangani(async () => {
  await wajibSesiAdmin(...PERAN.sistem);
  return NextResponse.json({ data: await ambilSemuaPengaturan() });
});

export const PUT = tangani(async (req: Request) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.sistem);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const data = await simpanPengaturanAdmin(await req.json().catch(() => ({})), { userId: sesi.sub, ip });
  segarkanHalamanPublik();
  return NextResponse.json({ data });
});
