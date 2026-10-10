import { NextResponse, type NextRequest } from "next/server";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { hubungkanDrive } from "@/server/services/penyimpanan/driveOAuth";
import { samaAmanWaktu } from "@/server/services/kripto";
import { GalatApi } from "@/server/types/galat";
import { tangani } from "../../../../_lib/tangani";

const COOKIE_STATE = "spmb_gd_state";

export const GET = tangani(async (req: NextRequest) => {
  await wajibSesiAdmin("superadmin");

  const params = req.nextUrl.searchParams;
  const state = params.get("state");
  const dariCookie = req.cookies.get(COOKIE_STATE)?.value;
  if (!state || !dariCookie || !samaAmanWaktu(state, dariCookie)) {
    throw GalatApi.dilarang("State OAuth tidak cocok. Ulangi proses hubungkan Google Drive.");
  }

  const hasil = new URL("/admin", req.nextUrl.origin);
  if (params.get("error")) {
    hasil.searchParams.set("drive", "ditolak");
  } else {
    const kode = params.get("code");
    if (!kode) throw new GalatApi(400, "BAD_REQUEST", "Kode otorisasi tidak ada.");
    await hubungkanDrive(kode);
    hasil.searchParams.set("drive", "terhubung");
  }

  const res = NextResponse.redirect(hasil);
  res.cookies.delete({ name: COOKIE_STATE, path: "/api/v1/admin/google-drive" });
  return res;
});
