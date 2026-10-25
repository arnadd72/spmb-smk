import { NextResponse } from "next/server";
import { pratinjauHapus } from "@/server/actions/hapusPendaftar";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../../_lib/tangani";

/** Daftar pendaftar yang akan terhapus untuk satu pilihan (manual, tanggal, atau nomor urut). Tidak mengubah data. */
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  await wajibSesiAdmin(...PERAN.sistem);
  const mentah = await req.json().catch(() => null);
  return NextResponse.json({ data: await pratinjauHapus(mentah) });
});
