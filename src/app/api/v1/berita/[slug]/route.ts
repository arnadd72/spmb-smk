import { ambilBerita } from "@/server/actions/ambilPublik";
import { GalatApi } from "@/server/types/galat";
import { jsonPublik } from "../../../_lib/publik";
import { tangani } from "../../../_lib/tangani";

export const GET = tangani(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const b = await ambilBerita((await params).slug);
  if (!b) throw GalatApi.tidakDitemukan("Berita tidak ditemukan.");
  return jsonPublik({ data: b });
});
