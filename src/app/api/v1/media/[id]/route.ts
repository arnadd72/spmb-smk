import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { bukaMediaPublik } from "@/server/services/media";
import { GalatApi } from "@/server/types/galat";
import { tangani } from "../../../_lib/tangani";

// Foto web dari Google Drive (poin B). Hanya berkas bertanda publik yang dikirim; dokumen pendaftar, berkas terhapus, ID tak
// dikenal, dan ID tidak sah mendapat 404 yang sama tanpa rincian. Isi berkas Drive tidak pernah berubah (ganti foto = berkas
// baru), jadi aman di-cache selamanya oleh CDN dan next/image; Drive hanya dipanggil sekali per gambar per ukuran.

export const GET = tangani(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const media = await bukaMediaPublik((await params).id);
  if (!media) throw GalatApi.tidakDitemukan("Gambar tidak ditemukan.");
  return new NextResponse(Readable.toWeb(media.aliran) as ReadableStream, {
    headers: {
      "Content-Type": media.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
