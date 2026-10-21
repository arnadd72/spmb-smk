import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { muatGaleriBawaan } from "@/server/services/asetSitus";
import { segarkanHalamanPublik } from "../../../../_lib/konten";
import { tangani } from "../../../../_lib/tangani";

/** Salin lima foto bawaan landing ke galeri (hanya bila galeri kosong) supaya bisa diubah atau dihapus admin. */
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.konten);
  const jumlah = await muatGaleriBawaan({ userId: sesi.sub, ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() });
  segarkanHalamanPublik();
  return NextResponse.json({ jumlah }, { status: 201 });
});
