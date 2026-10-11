import { NextResponse } from "next/server";
import { ambilKuota, simpanKuota } from "@/server/actions/kuota";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../_lib/tangani";
import { segarkanHalamanPublik } from "../../../_lib/konten";

export const GET = tangani(async () => {
  await wajibSesiAdmin(...PERAN.pendaftar);
  return NextResponse.json(await ambilKuota());
});

/** Simpan massal kuota semua jurusan dalam satu transaksi. */
export const PUT = tangani(async (req: Request) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const hasil = await simpanKuota(await req.json().catch(() => ({})), { userId: sesi.sub, ip });
  segarkanHalamanPublik();
  return NextResponse.json(hasil);
});
