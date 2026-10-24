import { NextResponse } from "next/server";
import { ambilJurusanRingkas } from "@/server/actions/ambilReferensi";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../_lib/tangani";

// Daftar jurusan untuk panel admin (baca saja); ubah profil dan kuota lewat /admin/jurusan/{kode}.
export const GET = tangani(async () => {
  await wajibSesiAdmin(...PERAN.referensi);
  return NextResponse.json({ data: await ambilJurusanRingkas() });
});
