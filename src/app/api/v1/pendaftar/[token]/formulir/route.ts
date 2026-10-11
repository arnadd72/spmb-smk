import { NextResponse } from "next/server";
import { formulirDariToken } from "@/server/services/pdf/formulir";
import { GalatApi } from "@/server/types/galat";
import { tangani } from "../../../../_lib/tangani";

/**
 * PDF formulir pendaftaran untuk pemilik token akses (dari halaman sukses). Token acak 40 karakter berperan
 * sebagai kunci akses; PDF memuat data pribadi sehingga tidak boleh disimpan cache bersama.
 * `?unduh=1` memaksa unduh, bawaannya tampil di tab untuk dicetak.
 */
export const GET = tangani(async (req: Request, ctx: RouteContext<"/api/v1/pendaftar/[token]/formulir">) => {
  const { token } = await ctx.params;
  const hasil = await formulirDariToken(token);
  if (!hasil) throw GalatApi.tidakDitemukan("Formulir tidak ditemukan.");

  const unduh = new URL(req.url).searchParams.get("unduh") === "1";
  return new NextResponse(Buffer.from(hasil.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${unduh ? "attachment" : "inline"}; filename="Formulir-${hasil.nomor}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
});
