import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { periksaOrigin } from "@/server/auth/csrf";
import { ipDariRequest } from "../../_lib/draf";
import { tangani } from "../../_lib/tangani";
import { bacaTokenEditFormulir, NAMA_COOKIE_EDIT, simpanFormEditPublik } from "@/server/services/editFormulir";
import { GalatApi } from "@/server/types/galat";

export const PATCH = tangani(async (req: Request) => {
  periksaOrigin(req);
  const token = (await cookies()).get(NAMA_COOKIE_EDIT)?.value;
  const id = await bacaTokenEditFormulir(token);
  if (!id) throw new GalatApi(401, "UNAUTHORIZED", "Sesi edit sudah berakhir. Silakan verifikasi kembali.");
  const hasil = await simpanFormEditPublik(id, await req.json().catch(() => ({})), ipDariRequest(req));
  return NextResponse.json(hasil);
});
