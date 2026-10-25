import { NextResponse } from "next/server";
import { cariUntukHapus } from "@/server/actions/hapusPendaftar";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { tangani } from "../../../../_lib/tangani";

/** Pencarian pendaftar untuk dicentang pada tab manual (?q=&periode=), maksimal 50 baris. */
export const GET = tangani(async (req: Request) => {
  await wajibSesiAdmin(...PERAN.sistem);
  const q = new URL(req.url).searchParams;
  return NextResponse.json({ data: await cariUntukHapus(q.get("q") ?? "", q.get("periode") ?? "semua") });
});
