import { ambilJurusanPublik } from "@/server/actions/ambilPublik";
import { GalatApi } from "@/server/types/galat";
import { jsonPublik } from "../../../_lib/publik";
import { tangani } from "../../../_lib/tangani";

export const GET = tangani(async (_req: Request, { params }: { params: Promise<{ kode: string }> }) => {
  const j = await ambilJurusanPublik((await params).kode);
  if (!j) throw GalatApi.tidakDitemukan("Jurusan tidak ditemukan.");
  return jsonPublik({ data: j });
});
