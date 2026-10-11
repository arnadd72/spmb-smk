import { NextResponse } from "next/server";
import { hapusField, ubahField } from "@/server/actions/formBuilder";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../../_lib/tangani";

type Konteks = { params: Promise<{ kunci: string }> };
const ipDari = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

export const PUT = tangani(async (req: Request, { params }: Konteks) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.sistem);
  return NextResponse.json({ data: await ubahField((await params).kunci, await req.json().catch(() => ({})), { userId: sesi.sub, ip: ipDari(req) }) });
});

export const DELETE = tangani(async (req: Request, { params }: Konteks) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.sistem);
  await hapusField((await params).kunci, { userId: sesi.sub, ip: ipDari(req) });
  return new NextResponse(null, { status: 204 });
});
