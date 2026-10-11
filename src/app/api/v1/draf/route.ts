import { NextResponse } from "next/server";
import { periksaOrigin } from "@/server/auth/csrf";
import { NAMA_COOKIE_DRAF, ambilDraf, buatDraf, hapusDraf, opsiCookieDraf } from "@/server/services/draf";
import { ipDariRequest, tokenDrafDariCookie } from "../../_lib/draf";
import { tangani } from "../../_lib/tangani";

/** Mulai wizard: pakai draf yang masih berlaku, atau buat baru dan pasang cookie spmb_draft. */
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const ada = await ambilDraf(await tokenDrafDariCookie());
  if (ada && !ada.sudahKirim) return NextResponse.json({ langkahTerakhir: ada.langkahTerakhir, baru: false });

  const { token } = await buatDraf(ipDariRequest(req), req.headers.get("user-agent") ?? undefined);
  const res = NextResponse.json({ langkahTerakhir: 1, baru: true }, { status: 201 });
  res.cookies.set(NAMA_COOKIE_DRAF, token, opsiCookieDraf());
  return res;
});

/** "Mulai ulang": hapus draf beserta berkas sementaranya. */
export const DELETE = tangani(async (req: Request) => {
  periksaOrigin(req);
  await hapusDraf(await tokenDrafDariCookie());
  const res = new NextResponse(null, { status: 204 });
  res.cookies.delete(NAMA_COOKIE_DRAF);
  return res;
});
