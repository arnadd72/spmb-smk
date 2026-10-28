import { NextResponse } from "next/server";
import { hapusAkun, ubahAkun } from "@/server/actions/akun";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../../_lib/tangani";

/** Ubah nama, peran, status aktif, atau reset password (password sementara baru ditampilkan sekali). */
export const PATCH = tangani(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.sistem);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const hasil = await ubahAkun((await params).id, await req.json().catch(() => ({})), { userId: sesi.sub, ip });
  return NextResponse.json(hasil, { headers: { "Cache-Control": "no-store" } });
});

/** Hapus akun panitia atau operator konten. Wajib body { password } berisi password superadmin yang sedang masuk. */
export const DELETE = tangani(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.sistem);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const hasil = await hapusAkun((await params).id, await req.json().catch(() => ({})), { userId: sesi.sub, ip });
  return NextResponse.json(hasil, { headers: { "Cache-Control": "no-store" } });
});
