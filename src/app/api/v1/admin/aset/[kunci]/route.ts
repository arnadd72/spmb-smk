import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { gantiAset, kembalikanAset } from "@/server/services/asetSitus";
import { segarkanHalamanPublik } from "../../../../_lib/konten";
import { tangani } from "../../../../_lib/tangani";

type Konteks = { params: Promise<{ kunci: string }> };
const ipDari = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

// Logo ada di layout publik, jadi seluruh rute publik perlu disegarkan, bukan hanya beranda.
function segarkan() {
  revalidatePath("/", "layout");
  segarkanHalamanPublik();
}

/** Ganti foto satu slot: body { url } berisi alamat hasil unggah dari /admin/media. */
export const PUT = tangani(async (req: Request, { params }: Konteks) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.konten);
  await gantiAset((await params).kunci, await req.json().catch(() => ({})), { userId: sesi.sub, ip: ipDari(req) });
  segarkan();
  return NextResponse.json({ ok: true });
});

/** Kembalikan slot ke foto bawaan situs. */
export const DELETE = tangani(async (req: Request, { params }: Konteks) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.konten);
  await kembalikanAset((await params).kunci, { userId: sesi.sub, ip: ipDari(req) });
  segarkan();
  return new NextResponse(null, { status: 204 });
});
