import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { NAMA_COOKIE_EDIT, bacaTokenEditFormulir } from "@/server/services/editFormulir";
import { formulirDariId } from "@/server/services/pdf/formulir";
import { GalatApi } from "@/server/types/galat";
import { tangani } from "../../../_lib/tangani";

// Unduh ulang formulir PDF dari halaman Cek Pendaftaran (poin D), untuk pendaftar yang lupa mengunduh atau mencetak
// setelah kirim. Hanya lewat sesi yang sah (cookie httpOnly hasil verifikasi nomor dan tanggal lahir); PDF memuat data
// pribadi sehingga tidak boleh disimpan cache bersama.

export const GET = tangani(async () => {
  const id = await bacaTokenEditFormulir((await cookies()).get(NAMA_COOKIE_EDIT)?.value);
  if (!id) throw new GalatApi(401, "UNAUTHORIZED", "Sesi sudah berakhir. Silakan verifikasi kembali.");
  const hasil = await formulirDariId(id);
  if (!hasil) throw GalatApi.tidakDitemukan("Formulir tidak ditemukan.");
  return new NextResponse(Buffer.from(hasil.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Formulir-${hasil.nomor}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
});
