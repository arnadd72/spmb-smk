import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { bukaBerkas } from "@/server/actions/berkas";
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
