import { NextResponse } from "next/server";

/**
 * Respons JSON untuk endpoint publik (tanpa login): hanya data yang memang tampil di situs. Boleh di-cache CDN
 * sebentar karena konten berubah jarang; admin menyimpan konten akan merevalidasi halaman, API ini cukup kedaluwarsa sendiri.
 */
export function jsonPublik(data: unknown, opsi: { detik?: number; status?: number } = {}) {
  const detik = opsi.detik ?? 60;
  return NextResponse.json(data, {
    status: opsi.status ?? 200,
    headers: { "Cache-Control": `public, s-maxage=${detik}, stale-while-revalidate=${detik * 5}` },
  });
}
