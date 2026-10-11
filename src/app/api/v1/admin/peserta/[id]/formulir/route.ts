import { NextResponse } from "next/server";
import { idPendaftar } from "@/server/actions/peserta";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { formulirDariNomor } from "@/server/services/pdf/formulir";
import { GalatApi } from "@/server/types/galat";
import { tangani } from "../../../../../_lib/tangani";

/** PDF formulir pendaftar untuk panitia. `?unduh=1` memaksa unduh. */
export const GET = tangani(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const p = await prisma.pendaftar.findUnique({ where: { id: idPendaftar((await params).id) }, select: { id: true, nomorPendaftaran: true } });
  if (!p) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");
  const hasil = await formulirDariNomor(p.nomorPendaftaran);
  if (!hasil) throw GalatApi.tidakDitemukan("Formulir tidak ditemukan.");

  await catatAudit({ userId: sesi.sub, aksi: "pendaftar.formulir", entitasTipe: "pendaftar", entitasId: p.id.toString() });
  const unduh = new URL(req.url).searchParams.get("unduh") === "1";
  return new NextResponse(Buffer.from(hasil.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${unduh ? "attachment" : "inline"}; filename="Formulir-${hasil.nomor}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
