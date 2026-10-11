import { ambilDaftarJurusan } from "@/server/actions/ambilPublik";
import { jsonPublik } from "../../_lib/publik";
import { tangani } from "../../_lib/tangani";

export const GET = tangani(async () => jsonPublik({ data: await ambilDaftarJurusan() }));
