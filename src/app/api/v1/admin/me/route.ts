import { NextResponse } from "next/server";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../_lib/tangani";

export const GET = tangani(async () => {
  const sesi = await wajibSesiAdmin();
  return NextResponse.json({ user: { id: sesi.sub, nama: sesi.nama, peran: sesi.peran } });
});
