import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { bacaKategoriMedia, simpanMedia } from "@/server/services/media";
import { GalatApi } from "@/server/types/galat";
import { tangani } from "../../../_lib/tangani";

/** Unggah gambar konten (multipart: berkas, kategori). Mengembalikan alamat gambar untuk disimpan di kolom gambar. */
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  await wajibSesiAdmin(...PERAN.konten);
  const form = await req.formData().catch(() => null);
  const berkas = form?.get("berkas");
  if (!(berkas instanceof File)) throw GalatApi.validasi({ berkas: ["Berkas tidak ditemukan pada permintaan."] });
  const kategori = bacaKategoriMedia(form?.get("kategori"));
  const url = await simpanMedia(Buffer.from(await berkas.arrayBuffer()), kategori);
  return NextResponse.json({ url }, { status: 201 });
});
