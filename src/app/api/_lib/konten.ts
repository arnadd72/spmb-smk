import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { ambilKonten, buatKonten, daftarKonten, hapusKonten, ubahKonten, type Entitas } from "@/server/actions/konten";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "./tangani";

/** Halaman publik yang bergantung pada konten ini disegarkan segera setelah admin menyimpan (PRD 10.2). */
export function segarkanHalamanPublik() {
  revalidatePath("/");
  revalidatePath("/berita");
  revalidatePath("/berita/[slug]", "page");
  revalidatePath("/jurusan");
  revalidatePath("/jurusan/[kode]", "page");
  revalidatePath("/tes-minat-bakat");
}

const ipDari = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

/** GET daftar dan POST buat untuk satu entitas konten. Peran: konten dan superadmin. */
export function buatKoleksi(entitas: Entitas) {
  return {
    GET: tangani(async (req: NextRequest) => {
      await wajibSesiAdmin(...PERAN.konten);
      const p = req.nextUrl.searchParams;
      const hasil = await daftarKonten(entitas, { q: p.get("q") ?? undefined, halaman: Number(p.get("halaman")) || 1, per: Number(p.get("per")) || 20 });
      return NextResponse.json(hasil);
    }),
    POST: tangani(async (req: Request) => {
      periksaOrigin(req);
      const sesi = await wajibSesiAdmin(...PERAN.konten);
      const baru = await buatKonten(entitas, await req.json().catch(() => ({})), { userId: sesi.sub, ip: ipDari(req) });
      segarkanHalamanPublik();
      return NextResponse.json({ data: baru }, { status: 201 });
    }),
  };
}

type Konteks = { params: Promise<{ id: string }> };

/** GET, PUT, DELETE satu baris. */
export function buatItem(entitas: Entitas) {
  return {
    GET: tangani(async (_req: Request, { params }: Konteks) => {
      await wajibSesiAdmin(...PERAN.konten);
      return NextResponse.json({ data: await ambilKonten(entitas, (await params).id) });
    }),
    PUT: tangani(async (req: Request, { params }: Konteks) => {
      periksaOrigin(req);
      const sesi = await wajibSesiAdmin(...PERAN.konten);
      const baru = await ubahKonten(entitas, (await params).id, await req.json().catch(() => ({})), { userId: sesi.sub, ip: ipDari(req) });
      segarkanHalamanPublik();
      return NextResponse.json({ data: baru });
    }),
    DELETE: tangani(async (req: Request, { params }: Konteks) => {
      periksaOrigin(req);
      const sesi = await wajibSesiAdmin(...PERAN.konten);
      await hapusKonten(entitas, (await params).id, { userId: sesi.sub, ip: ipDari(req) });
      segarkanHalamanPublik();
      return new NextResponse(null, { status: 204 });
    }),
  };
}
