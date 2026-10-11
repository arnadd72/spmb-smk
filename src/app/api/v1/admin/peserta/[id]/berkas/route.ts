import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { bukaBerkas, hapusBerkasPendaftar, unggahBerkasPendaftar } from "@/server/actions/berkas";
import { periksaOrigin } from "@/server/auth/csrf";
import { GalatApi } from "@/server/types/galat";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../../../_lib/tangani";

/** Menampilkan satu berkas pendaftar (?kunci=akta&i=0). Tanpa URL publik: selalu lewat sesi panitia. */
export const GET = tangani(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const q = new URL(req.url).searchParams;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const { aliran, mime, nama } = await bukaBerkas((await params).id, q.get("kunci") ?? "", Number(q.get("i") ?? 0) || 0, { userId: sesi.sub, ip });

  const unduh = q.get("unduh") === "1";
  return new NextResponse(Readable.toWeb(aliran) as ReadableStream, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${unduh || mime === "application/octet-stream" ? "attachment" : "inline"}; filename="${nama.replace(/[^\w.\- ]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

/** Ganti Akta/KK atau tambah halaman Rapor (multipart: kunci, berkas). */
export const POST = tangani(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const form = await req.formData().catch(() => null);
  const kunci = form?.get("kunci");
  const berkas = form?.get("berkas");
  if (typeof kunci !== "string" || !(berkas instanceof File)) throw GalatApi.validasi({ berkas: ["Berkas tidak ditemukan pada permintaan."] });
  const daftar = await unggahBerkasPendaftar((await params).id, kunci, Buffer.from(await berkas.arrayBuffer()), berkas.name, { userId: sesi.sub, ip });
  return NextResponse.json({ data: daftar }, { status: 201 });
});

export const DELETE = tangani(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const { kunci, i } = (await req.json().catch(() => ({}))) as { kunci?: string; i?: number };
  if (!kunci) throw GalatApi.validasi({ berkas: ["Berkas tidak valid."] });
  return NextResponse.json({ data: await hapusBerkasPendaftar((await params).id, kunci, Number(i) || 0, { userId: sesi.sub, ip }) });
});
