import { NextResponse } from "next/server";
import { ambilSesiAdmin } from "@/server/auth/verifikasiSesi";
import { GalatApi } from "@/server/types/galat";
import { tangani } from "../../../_lib/tangani";

export const GET = tangani(async () => {
  const sesi = await ambilSesiAdmin();
  if (!sesi) throw GalatApi.tidakTerautentikasi();
  return NextResponse.json({ user: { id: sesi.sub, nama: sesi.nama, peran: sesi.peran, wajibGantiPassword: Boolean(sesi.mcp) } });
});
