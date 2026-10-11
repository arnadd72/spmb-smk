import { ambilDaftarBerita } from "@/server/actions/ambilPublik";
import { jsonPublik } from "../../_lib/publik";
import { tangani } from "../../_lib/tangani";

/** Berita terbit terbaru. `?batas=` 1 sampai 50 (bawaan 30). */
export const GET = tangani(async (req: Request) => {
  const batas = Number(new URL(req.url).searchParams.get("batas"));
  return jsonPublik({ data: await ambilDaftarBerita(Number.isInteger(batas) && batas > 0 ? Math.min(batas, 50) : 30) });
});
