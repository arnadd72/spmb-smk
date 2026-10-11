import { NextResponse } from "next/server";
import { sinkronSemuaTertunda } from "@/server/actions/berkas";
import { periksaOrigin } from "@/server/auth/csrf";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { prisma } from "@/server/db/client";
import { tangani } from "../../../_lib/tangani";

/** Jumlah pendaftar yang berkasnya menunggu atau gagal disinkronkan ke Drive. */
export const GET = tangani(async () => {
  await wajibSesiAdmin(...PERAN.pendaftar);
  const [menunggu, gagal] = await Promise.all([
    prisma.pendaftar.count({ where: { berkasSinkron: "menunggu" } }),
    prisma.pendaftar.count({ where: { berkasSinkron: "gagal" } }),
  ]);
  return NextResponse.json({ menunggu, gagal });
});

/** Sinkron ulang semua berkas yang menunggu atau gagal (maksimal 25 per permintaan). */
export const POST = tangani(async (req: Request) => {
  periksaOrigin(req);
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return NextResponse.json(await sinkronSemuaTertunda({ userId: sesi.sub, ip }));
});
