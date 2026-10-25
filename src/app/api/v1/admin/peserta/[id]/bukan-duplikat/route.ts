import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tandaiBukanDuplikat } from "@/server/services/pendaftarGanda";
import { tangani } from "../../../../../_lib/tangani";

/** Tandai pendaftar sudah diperiksa: nama dan tanggal lahirnya sama dengan pendaftar lain, tetapi bukan orang yang sama (poin E). */
export const POST = tangani(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  await tandaiBukanDuplikat((await params).id, { userId: sesi.sub, ip });
  return NextResponse.json({ ok: true });
});
