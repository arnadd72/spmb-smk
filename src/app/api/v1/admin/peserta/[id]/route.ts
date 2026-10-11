import { NextResponse } from "next/server";
import { ambilPeserta, ubahPeserta } from "@/server/actions/peserta";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../../_lib/tangani";

type Konteks = { params: Promise<{ id: string }> };

export const GET = tangani(async (_req: Request, { params }: Konteks) => {
  await wajibSesiAdmin(...PERAN.pendaftar);
  return NextResponse.json({ data: await ambilPeserta((await params).id) });
});

/** Ubah data pendaftar (aturan validasi sama dengan wizard). Dicatat di audit dengan data lama dan baru. */
export const PATCH = tangani(async (req: Request, { params }: Konteks) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const hasil = await ubahPeserta((await params).id, await req.json().catch(() => ({})), { userId: sesi.sub, ip });
  return NextResponse.json(hasil);
});
