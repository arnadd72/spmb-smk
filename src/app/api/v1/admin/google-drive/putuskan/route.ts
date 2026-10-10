import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { putuskanDrive } from "@/server/services/penyimpanan/driveOAuth";
import { tangani } from "../../../../_lib/tangani";

export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  await wajibSesiAdmin("superadmin");
  await putuskanDrive();
  return NextResponse.json({ terhubung: false });
});
