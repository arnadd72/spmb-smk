import { Readable } from "node:stream";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { KUNCI_BERKAS_GANTI, bukaBerkas, unggahBerkasPendaftar } from "@/server/actions/berkas";
import { periksaOrigin } from "@/server/auth/csrf";
import { NAMA_COOKIE_EDIT, bacaTokenEditFormulir } from "@/server/services/editFormulir";
import { GalatApi } from "@/server/types/galat";
import { ipDariRequest } from "../../../_lib/draf";
import { tangani } from "../../../_lib/tangani";

// Berkas milik pendaftar di halaman Edit Formulir (PRD 1.3 butir 66): hanya Akta, KK, dan pas foto, hanya lewat sesi
// edit yang sah (cookie httpOnly 30 menit). Tidak ada URL publik.

async function idDariSesi(): Promise<string> {
  const id = await bacaTokenEditFormulir((await cookies()).get(NAMA_COOKIE_EDIT)?.value);
  if (!id) throw new GalatApi(401, "UNAUTHORIZED", "Sesi edit sudah berakhir. Silakan verifikasi kembali.");
  return id;
}

const kunciSah = (k: unknown): k is string => typeof k === "string" && (KUNCI_BERKAS_GANTI as readonly string[]).includes(k);

/** Lihat berkas sendiri (?kunci=akta). */
export const GET = tangani(async (req: Request) => {
  const id = await idDariSesi();
  const kunci = new URL(req.url).searchParams.get("kunci");
  if (!kunciSah(kunci)) throw GalatApi.tidakDitemukan("Berkas tidak ditemukan.");
  const { aliran, mime, nama } = await bukaBerkas(id, kunci, 0);
  return new NextResponse(Readable.toWeb(aliran) as ReadableStream, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${mime === "application/octet-stream" ? "attachment" : "inline"}; filename="${nama.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

/** Ganti atau tambah Akta, KK, atau pas foto (multipart: kunci, berkas). */
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const id = await idDariSesi();
  const form = await req.formData().catch(() => null);
  const kunci = form?.get("kunci");
  const berkas = form?.get("berkas");
  if (!kunciSah(kunci) || !(berkas instanceof File)) throw GalatApi.validasi({ berkas: ["Berkas tidak ditemukan pada permintaan."] });
  const daftar = await unggahBerkasPendaftar(id, kunci, Buffer.from(await berkas.arrayBuffer()), berkas.name, { ip: ipDariRequest(req) });
  return NextResponse.json({ data: daftar.filter((b) => kunciSah(b.kunci)) }, { status: 201 });
});
