import { ambilDataLanding } from "@/server/actions/ambilLanding";
import { jsonPublik } from "../../_lib/publik";
import { tangani } from "../../_lib/tangani";

/** Data beranda: jurusan, FAQ, berita, agenda, galeri, testimoni (hanya yang aktif). */
export const GET = tangani(async () => jsonPublik(await ambilDataLanding()));
