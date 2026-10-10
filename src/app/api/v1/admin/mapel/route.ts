import { NextResponse } from "next/server";
import { ambilMataPelajaran } from "@/server/actions/ambilReferensi";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../_lib/tangani";

export const GET = tangani(async () => {
  await wajibSesiAdmin(...PERAN.referensi);
  return NextResponse.json({ data: await ambilMataPelajaran() });
});
