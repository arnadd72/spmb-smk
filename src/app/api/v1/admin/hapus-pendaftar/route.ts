import { NextResponse } from "next/server";
import { hapusPendaftar } from "@/server/actions/hapusPendaftar";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../_lib/tangani";

// Menghapus folder Drive satu per satu lambat; halaman mengirim 10 pendaftar per permintaan (MAKS_PER_PERMINTAAN).
export const maxDuration = 60;

/** Hapus pendaftar permanen (body: { ids, password }). Hanya superadmin, password diperiksa di setiap permintaan. */
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.sistem);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const mentah = await req.json().catch(() => null);
  return NextResponse.json({ data: await hapusPendaftar(sesi, mentah, ip) });
});
