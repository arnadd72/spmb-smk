import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { prisma } from "@/server/db/client";
import { kondisiPeserta, type FilterPeserta } from "@/server/services/pencarianPeserta";
import { GalatApi } from "@/server/types/galat";
import { amankan, pas } from "./formulir";

// Rekap PDF pendaftar (PRD v3.1 15.3): A4 landscape, kop, judul + periode + filter, tabel, nomor halaman, tanda tangan panitia.
// Dibuat langsung dengan pdf-lib (laporan internal, tidak terikat template formulir).

export const MAKS_BARIS_REKAP = 5000;

const LEBAR = 841.89;
const TINGGI = 595.28;
const MARGIN = 36;
const TINGGI_BARIS = 17;
const HIJAU = rgb(0x05 / 255, 0x7a / 255, 0x3c / 255);
const HITAM = rgb(0.07, 0.07, 0.07);
const ABU = rgb(0.45, 0.45, 0.45);

const KOLOM = [
  { judul: "No", lebar: 26, rata: "kanan" as const },
  { judul: "No. Pendaftaran", lebar: 92 },
  { judul: "Nama", lebar: 216 },
  { judul: "NISN", lebar: 66 },
  { judul: "Asal Sekolah", lebar: 196 },
  { judul: "Pil. 1", lebar: 38 },
  { judul: "Pil. 2", lebar: 38 },
  { judul: "Dikirim", lebar: 70 },
];

const tanggalPendek = (d: Date) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jakarta" }).format(d);
const tanggalPanjang = (d: Date) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(d);

/** Keterangan filter yang dipakai, untuk subjudul laporan. */
export function ringkasFilter(f: FilterPeserta, periodeAktif: string): string {
  const bagian = [`Periode ${f.periode === "semua" ? "semua" : (f.periode ?? periodeAktif)}`];
  if (f.jurusan) bagian.push(`pilihan 1 ${f.jurusan}`);
  if (f.sumber) bagian.push(`sumber ${f.sumber}`);
  if (f.sinkron) bagian.push(`sinkron berkas ${f.sinkron}`);
  if (f.dari) bagian.push(`dari ${f.dari}`);
  if (f.sampai) bagian.push(`sampai ${f.sampai}`);
  if (f.q) bagian.push(`kata kunci "${f.q}"`);
  return bagian.join(", ");
}

function teks(page: PDFPage, s: string, x: number, y: number, font: PDFFont, ukuran: number, warna = HITAM, tengah?: { lebar: number }) {
  const aman = amankan(s, font);
  const w = font.widthOfTextAtSize(aman, ukuran);
  page.drawText(aman, { x: tengah ? x + (tengah.lebar - w) / 2 : x, y, size: ukuran, font, color: warna });
}

export async function buatRekapPdf(filter: FilterPeserta, periodeAktif: string): Promise<{ pdf: Uint8Array; jumlah: number }> {
  const where = kondisiPeserta(filter, periodeAktif);
  const total = await prisma.pendaftar.count({ where });
  if (total > MAKS_BARIS_REKAP) throw GalatApi.validasi({ _: [`Terlalu banyak data (${total}). Persempit filter hingga maksimal ${MAKS_BARIS_REKAP} baris.`] });

  const baris = await prisma.pendaftar.findMany({
    where,
    orderBy: [{ nomorPendaftaran: "asc" }],
    include: { jurusan1: { select: { kode: true } }, jurusan2: { select: { kode: true } } },
  });

  const doc = await PDFDocument.create();
  doc.setTitle("Rekapitulasi Pendaftar SPMB");
  doc.setAuthor("SMK Ma'arif NU 1 Wangon");
  const biasa = await doc.embedFont(StandardFonts.Helvetica);
  const tebal = await doc.embedFont(StandardFonts.HelveticaBold);
  const sekarang = new Date();

  let page = doc.addPage([LEBAR, TINGGI]);
  let y = TINGGI - MARGIN;

  // Kop
  teks(page, "LEMBAGA PENDIDIKAN MA'ARIF NU PCNU KAB. BANYUMAS", 0, y - 8, tebal, 10, HITAM, { lebar: LEBAR });
  teks(page, "SMK MA'ARIF NU 1 WANGON", 0, y - 24, tebal, 15, HIJAU, { lebar: LEBAR });
  teks(page, "Jl. Karangjengkol RT.02/RW.04 Wangon, Banyumas 53176 | Telp. (0281) 513425 | smk_maarifnu1wgn@yahoo.co.id", 0, y - 37, biasa, 8, ABU, { lebar: LEBAR });
  page.drawRectangle({ x: MARGIN, y: y - 44, width: LEBAR - 2 * MARGIN, height: 1.6, color: HIJAU });
  y -= 64;

  teks(page, "REKAPITULASI PENDAFTAR SPMB", 0, y, tebal, 12, HITAM, { lebar: LEBAR });
  y -= 14;
  const ket = pas(biasa, amankan(ringkasFilter(filter, periodeAktif), biasa), 8.5, LEBAR - 2 * MARGIN, 6);
  teks(page, ket.teks, 0, y, biasa, ket.ukuran, ABU, { lebar: LEBAR });
  y -= 11;
  teks(page, `Dicetak ${tanggalPanjang(sekarang)} | Jumlah pendaftar: ${baris.length}`, 0, y, biasa, 8.5, ABU, { lebar: LEBAR });
  y -= 18;

  const lebarTabel = KOLOM.reduce((a, k) => a + k.lebar, 0);
  const x0 = (LEBAR - lebarTabel) / 2;

  const kepalaTabel = () => {
    page.drawRectangle({ x: x0, y: y - TINGGI_BARIS + 4, width: lebarTabel, height: TINGGI_BARIS, color: HIJAU });
    let x = x0;
    for (const k of KOLOM) {
      teks(page, k.judul, x + 4, y - 7.5, tebal, 8.5, rgb(1, 1, 1));
      x += k.lebar;
    }
    y -= TINGGI_BARIS;
  };
  kepalaTabel();

  baris.forEach((p, i) => {
    if (y - TINGGI_BARIS < MARGIN + 28) {
      page = doc.addPage([LEBAR, TINGGI]);
      y = TINGGI - MARGIN;
      kepalaTabel();
    }
    if (i % 2 === 1) page.drawRectangle({ x: x0, y: y - TINGGI_BARIS + 4, width: lebarTabel, height: TINGGI_BARIS, color: rgb(0.955, 0.972, 0.96) });
    const sel = [
      String(i + 1),
      p.nomorPendaftaran,
      p.namaLengkap,
      p.nisn ?? "",
      p.asalSekolah ?? "",
      p.jurusan1?.kode ?? "",
      p.jurusan2?.kode ?? "",
      tanggalPendek(p.createdAt),
    ];
    let x = x0;
    KOLOM.forEach((k, j) => {
      const { teks: t, ukuran } = pas(biasa, amankan(sel[j], biasa), 8.5, k.lebar - 8, 6);
      const w = biasa.widthOfTextAtSize(t, ukuran);
      page.drawText(t, { x: k.rata === "kanan" ? x + k.lebar - 6 - w : x + 4, y: y - 7.5, size: ukuran, font: biasa, color: HITAM });
      x += k.lebar;
    });
    page.drawLine({ start: { x: x0, y: y - TINGGI_BARIS + 4 }, end: { x: x0 + lebarTabel, y: y - TINGGI_BARIS + 4 }, thickness: 0.3, color: rgb(0.8, 0.85, 0.82) });
    y -= TINGGI_BARIS;
  });

  if (baris.length === 0) {
    teks(page, "Tidak ada pendaftar yang cocok dengan filter ini.", x0 + 4, y - 8, biasa, 9, ABU);
    y -= TINGGI_BARIS;
  }

  // Tanda tangan panitia (halaman baru bila sisa ruang tidak cukup)
  if (y < MARGIN + 130) {
    page = doc.addPage([LEBAR, TINGGI]);
    y = TINGGI - MARGIN;
  }
  const xTtd = LEBAR - MARGIN - 190;
  y -= 24;
  teks(page, `Wangon, ${tanggalPanjang(sekarang)}`, xTtd, y, biasa, 10);
  teks(page, "Ketua Panitia SPMB", xTtd, y - 14, biasa, 10);
  page.drawLine({ start: { x: xTtd, y: y - 76 }, end: { x: xTtd + 170, y: y - 76 }, thickness: 0.6, color: HITAM });

  // Nomor halaman setelah jumlah halaman diketahui
  const halaman = doc.getPages();
  halaman.forEach((h, i) => {
    teks(h, `Halaman ${i + 1} dari ${halaman.length}`, 0, MARGIN - 18, biasa, 8, ABU, { lebar: LEBAR });
    teks(h, "Rekap SPMB SMK Ma'arif NU 1 Wangon - dokumen internal, memuat data pribadi", MARGIN, MARGIN - 18, biasa, 7, ABU);
  });

  return { pdf: await doc.save(), jumlah: baris.length };
}
