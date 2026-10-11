import { NextResponse } from "next/server";
import { bacaFilter } from "@/server/actions/peserta";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { catatAudit } from "@/server/services/audit";
import { ambilKonfigWizard } from "@/server/services/draf";
import { buatRekapPdf } from "@/server/services/pdf/rekap";
import { tangani } from "../../../../_lib/tangani";

/** Rekap PDF (A4 landscape) hasil filter, lengkap dengan kop dan tanda tangan panitia. */
export const GET = tangani(async (req: Request) => {
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const params = new URL(req.url).searchParams;
  const filter = bacaFilter(Object.fromEntries(params));
  const { tahunAjaran } = await ambilKonfigWizard();
  const { pdf, jumlah } = await buatRekapPdf(filter, tahunAjaran);

  await catatAudit({
    userId: sesi.sub,
    aksi: "pendaftar.ekspor",
    entitasTipe: "pendaftar",
    dataBaru: { format: "pdf", jumlah, filter: Object.fromEntries(params) },
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });
  const periode = (filter.periode === "semua" ? "semua" : (filter.periode ?? tahunAjaran)).replace("/", "-");
  const hari = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${params.get("unduh") === "1" ? "attachment" : "inline"}; filename="Rekap-SPMB-${periode}-${hari}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
