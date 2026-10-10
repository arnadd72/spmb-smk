import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { penyimpananDokumen, ujiPenyimpanan } from "@/server/services/penyimpanan";
import { statusDrive } from "@/server/services/penyimpanan/driveOAuth";
import { GalatApi } from "@/server/types/galat";
import { tangani } from "../../../../_lib/tangani";

// Uji tulis-baca-hapus berkas kecil di Google Drive (PRD v4 A0).
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  await wajibSesiAdmin("superadmin");

  if (!(await statusDrive()).terhubung) {
    throw new GalatApi(409, "DRIVE_NOT_CONNECTED", "Google Drive belum dihubungkan.");
  }

  try {
    await ujiPenyimpanan(await penyimpananDokumen());
  } catch (e) {
    throw new GalatApi(502, "DRIVE_TEST_FAILED", e instanceof Error ? e.message : "Uji Google Drive gagal.");
  }
  return NextResponse.json({ ok: true, tulis: true, baca: true, hapus: true });
});
