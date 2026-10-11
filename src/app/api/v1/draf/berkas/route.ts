import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { hapusBerkas, unggahBerkas } from "@/server/services/draf";
import { GalatApi } from "@/server/types/galat";
import { tokenDrafDariCookie } from "../../../_lib/draf";
import { tangani } from "../../../_lib/tangani";

/** Unggah satu berkas (multipart: kunci, berkas). Format dan ukuran diperiksa dari isi, bukan dari nama. */
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const form = await req.formData().catch(() => null);
  const kunci = form?.get("kunci");
  const berkas = form?.get("berkas");
  if (typeof kunci !== "string" || !(berkas instanceof File)) {
    throw GalatApi.validasi({ berkas: ["Berkas tidak ditemukan pada permintaan."] });
  }
  const hasil = await unggahBerkas(await tokenDrafDariCookie(), kunci, Buffer.from(await berkas.arrayBuffer()), berkas.name);
  return NextResponse.json(hasil, { status: 201 });
});

export const DELETE = tangani(async (req: Request) => {
  periksaOrigin(req);
  const { kunci, ref } = (await req.json().catch(() => ({}))) as { kunci?: string; ref?: string };
  if (!kunci || !ref) throw GalatApi.validasi({ berkas: ["Berkas tidak valid."] });
  await hapusBerkas(await tokenDrafDariCookie(), kunci, ref);
  return new NextResponse(null, { status: 204 });
});
