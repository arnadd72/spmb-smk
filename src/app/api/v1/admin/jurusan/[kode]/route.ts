import { NextResponse } from "next/server";
import { ambilJurusanAdmin, ubahJurusan } from "@/server/actions/konten";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../../_lib/tangani";
import { segarkanHalamanPublik } from "../../../../_lib/konten";

type Konteks = { params: Promise<{ kode: string }> };

export const GET = tangani(async (_req: Request, { params }: Konteks) => {
  await wajibSesiAdmin(...PERAN.sistem);
  return NextResponse.json({ data: await ambilJurusanAdmin((await params).kode) });
});

// Ubah jurusan: superadmin (PRD v3.1 13.9). Kode jurusan tidak bisa diubah.
export const PUT = tangani(async (req: Request, { params }: Konteks) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.sistem);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const baru = await ubahJurusan((await params).kode, await req.json().catch(() => ({})), { userId: sesi.sub, ip });
  segarkanHalamanPublik();
  return NextResponse.json({ data: baru });
});
