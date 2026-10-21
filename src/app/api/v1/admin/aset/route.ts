import { NextResponse } from "next/server";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { bawaanSudahDimuat, daftarAset } from "@/server/services/asetSitus";
import { tangani } from "../../../_lib/tangani";

/** Daftar foto situs (logo, hero, foto jurusan) beserta foto yang sedang tampil. Peran: konten dan superadmin. */
export const GET = tangani(async () => {
  await wajibSesiAdmin(...PERAN.konten);
  const [data, bawaanDimuat] = await Promise.all([daftarAset(), bawaanSudahDimuat()]);
  return NextResponse.json({ data, bawaanDimuat });
});
