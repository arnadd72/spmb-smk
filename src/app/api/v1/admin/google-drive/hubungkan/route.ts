import { NextResponse } from "next/server";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { urlOtorisasi } from "@/server/services/penyimpanan/driveOAuth";
import { buatTokenAcak } from "@/server/services/kripto";
import { GalatApi } from "@/server/types/galat";
import { tangani } from "../../../../_lib/tangani";

const COOKIE_STATE = "spmb_gd_state";

// Memulai alur OAuth: state acak disimpan di cookie httpOnly dan dicocokkan di callback (anti-CSRF OAuth).
export const GET = tangani(async () => {
  await wajibSesiAdmin("superadmin");

  if (!process.env.GOOGLE_DRIVE_CLIENT_ID || !process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
    throw new GalatApi(503, "NOT_CONFIGURED", "Kredensial Google Drive belum diisi di environment server.");
  }

  const state = buatTokenAcak(32);
  const res = NextResponse.redirect(urlOtorisasi(state));
  res.cookies.set(COOKIE_STATE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/admin/google-drive",
    maxAge: 600,
  });
  return res;
});
