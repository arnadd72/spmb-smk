import { NextResponse } from "next/server";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { statusDrive } from "@/server/services/penyimpanan/driveOAuth";
import { tangani } from "../../../../_lib/tangani";

export const GET = tangani(async () => {
  await wajibSesiAdmin("superadmin");
  return NextResponse.json(await statusDrive());
});
