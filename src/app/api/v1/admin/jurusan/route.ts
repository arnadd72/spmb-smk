import { NextResponse } from "next/server";
import { ambilJurusanDenganBobot } from "@/server/actions/ambilReferensi";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../_lib/tangani";

// Baca saja (A2). Tambah, ubah, dan hapus dikerjakan di A3 (konten dan jurusan) dan A6 (editor bobot).
export const GET = tangani(async () => {
  await wajibSesiAdmin(...PERAN.referensi);
  return NextResponse.json({ data: await ambilJurusanDenganBobot() });
});
