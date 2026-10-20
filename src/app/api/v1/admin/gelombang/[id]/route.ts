import { NextResponse } from "next/server";
import { hapusGelombang, ubahGelombang } from "@/server/actions/gelombang";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../../_lib/tangani";
import { segarkanHalamanPublik } from "../../../../_lib/konten";

type Konteks = { params: Promise<{ id: string }> };
const ipDari = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

export const PUT = tangani(async (req: Request, { params }: Konteks) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  await ubahGelombang((await params).id, await req.json().catch(() => ({})), { userId: sesi.sub, ip: ipDari(req) });
  segarkanHalamanPublik();
  return NextResponse.json({ data: { ok: true } });
});

export const DELETE = tangani(async (req: Request, { params }: Konteks) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  await hapusGelombang((await params).id, { userId: sesi.sub, ip: ipDari(req) });
  segarkanHalamanPublik();
  return new NextResponse(null, { status: 204 });
});
