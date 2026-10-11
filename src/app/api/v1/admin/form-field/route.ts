import { NextResponse } from "next/server";
import { buatField, daftarFieldAdmin } from "@/server/actions/formBuilder";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../_lib/tangani";

export const GET = tangani(async () => {
  await wajibSesiAdmin(...PERAN.sistem);
  return NextResponse.json({ data: await daftarFieldAdmin() });
});

/** Tambah isian kustom. */
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.sistem);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return NextResponse.json({ data: await buatField(await req.json().catch(() => ({})), { userId: sesi.sub, ip }) }, { status: 201 });
});
