import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import {
  buatTokenEditFormulir,
  NAMA_COOKIE_EDIT,
  opsiCookieEditFormulir,
  verifikasiAksesEditFormulir,
} from "@/server/services/editFormulir";
import { skemaCekStatus } from "@/server/validasi/wizard";
import { ipDariRequest } from "../../../_lib/draf";
import { tangani } from "../../../_lib/tangani";

export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const input = skemaCekStatus.parse(await req.json().catch(() => ({})));
  const id = await verifikasiAksesEditFormulir(input, ipDariRequest(req));
  const token = await buatTokenEditFormulir(id);
  const res = NextResponse.json({ berhasil: true });
  res.cookies.set(NAMA_COOKIE_EDIT, token, opsiCookieEditFormulir());
  return res;
});

export const DELETE = tangani(async (req: Request) => {
  periksaOrigin(req);
  const res = new NextResponse(null, { status: 204 });
  res.cookies.delete(NAMA_COOKIE_EDIT);
  return res;
});
