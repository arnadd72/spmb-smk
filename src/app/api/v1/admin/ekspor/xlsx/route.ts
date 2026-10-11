import { NextResponse } from "next/server";
import { bacaFilter } from "@/server/actions/peserta";
import { PERAN } from "@/server/auth/peran";
import { wajibSesiAdmin } from "@/server/auth/verifikasiSesi";
import { catatAudit } from "@/server/services/audit";
import { ambilKonfigWizard } from "@/server/services/draf";
import { buatXlsx } from "@/server/services/xlsx";
import { tangani } from "../../../../_lib/tangani";

/** Ekspor XLSX hasil filter (parameter sama dengan halaman Data Peserta). Memuat data pribadi, jadi diaudit dan tidak di-cache. */
export const GET = tangani(async (req: Request) => {
  const sesi = await wajibSesiAdmin(...PERAN.pendaftar);
  const params = new URL(req.url).searchParams;
  const filter = bacaFilter(Object.fromEntries(params));
  const { tahunAjaran } = await ambilKonfigWizard();
  const { buffer, jumlah } = await buatXlsx(filter, tahunAjaran);

  await catatAudit({
    userId: sesi.sub,
    aksi: "pendaftar.ekspor",
    entitasTipe: "pendaftar",
    dataBaru: { format: "xlsx", jumlah, filter: Object.fromEntries(params) },
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });
  const periode = (filter.periode === "semua" ? "semua" : (filter.periode ?? tahunAjaran)).replace("/", "-");
  const hari = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Pendaftar-SPMB-${periode}-${hari}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
});
