import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PDFDocument, StandardFonts, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { prisma } from "@/server/db/client";
import { dekripsi, hashToken } from "@/server/services/kripto";
import { penyimpananDokumen, penyimpananTemp } from "@/server/services/penyimpanan";
import { ambilPengaturan } from "@/server/services/pengaturan";
import {
  KOTAK_GENDER,
  KOTAK_JURUSAN,
  KOTAK_PENGHASILAN,
  KOTAK_SERAGAM,
  LEBAR_HALAMAN,
  SLOT_TEKS,
  TAHUN_TEMPLATE,
  TINGGI_HALAMAN,
  type Kotak,
  type SlotTeks,
} from "./peta-formulir";
import { terbilang } from "./terbilang";

// PDF formulir pendaftaran (PRD v4 15.1): lapisan tetap berasal dari template-dasar.pdf (ekspor template-formulir.docx),
// kode hanya menimpa isian di koordinat hasil pemetaan. Lapisan tetap tidak digambar ulang, jadi identik dengan template.

export type DataFormulir = {
  nomor: string;
  periode: string;
  dikirimPada: Date;
  tanggalVerifikasi?: string | null;
  namaLengkap: string;
  tempatLahir?: string | null;
  tanggalLahir?: Date | null;
  nisn?: string | null;
  nik?: string | null;
  noKk?: string | null;
  jenisKelamin?: string | null;
  agama?: string | null;
  anakKe?: number | null;
  jumlahSaudara?: number | null;
  asalSekolah?: string | null;
  tamatTahun?: string | null;
  noIjazah?: string | null;
  noHp?: string | null;
  email?: string | null;
  rt?: string | null;
  rw?: string | null;
  desa?: string | null;
  kecamatan?: string | null;
  kabupaten?: string | null;
  namaAyah?: string | null;
  ayahTtl?: string | null;
  ayahPendidikan?: string | null;
  pekerjaanAyah?: string | null;
  namaIbu?: string | null;
  ibuTempatLahir?: string | null;
  ibuTanggalLahir?: Date | null;
  ibuTtl?: string | null;
  ayahTempatLahir?: string | null;
  ayahTanggalLahir?: Date | null;
  ibuPendidikan?: string | null;
  pekerjaanIbu?: string | null;
  ortuRt?: string | null;
  ortuRw?: string | null;
  ortuDesa?: string | null;
  ortuKecamatan?: string | null;
  ortuKabupaten?: string | null;
  ortuPropinsi?: string | null;
  noHpOrtu?: string | null;
  penghasilan?: string | null;
  referensiPendaftar?: string | null;
  smpKecamatan?: string | null;
  smpKabupaten?: string | null;
  smpPropinsi?: string | null;
  ijazahNomorTahun?: string | null;
  lamaBelajar?: string | null;
  /** Pas foto pendaftar (gambar apa pun); ditempel di kotak "Pas photo 3 x 4" halaman 2. */
  pasFoto?: Uint8Array | null;
  nilaiUjian?: { b_indonesia?: number; b_inggris?: number; matematika?: number; ipa?: number } | null;
  golonganDarah?: string | null;
  tinggiBadan?: number | null;
  beratBadan?: number | null;
  penyakitPernahDiderita?: string | null;
  hobiOlahraga?: string | null;
  hobiKesenian?: string | null;
  hobiOrganisasi?: string | null;
  hobiPrestasi?: string | null;
  hobiLain?: string | null;
  ukuranSeragam?: string | null;
  jurusan1?: { kode: string; nama: string } | null;
  jurusan2?: { kode: string; nama: string } | null;
};

/** Jejak setiap penggambaran, dipakai test untuk memastikan isian jatuh di koordinat hasil pemetaan. */
export type Jejak = { id: string; h: number; x: number; y: number; ukuran: number; teks: string };

const UKURAN_BAWAAN = 11;
const UKURAN_MIN = 6.5;

const tanggalPanjang = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(d).toUpperCase();

const bagi = (periode: string) => (/^(\d{4})\/(\d{4})$/.exec(periode) ?? []).slice(1);
const ttlOrangTua = (tempat: string | null | undefined, tanggal: Date | null | undefined, lama: string | null | undefined) =>
  [tempat, tanggal ? tanggalPanjang(tanggal) : ""].filter(Boolean).join(", ") || lama || "";

/** Nilai teks tiap slot dari data pendaftar. String kosong = dilewati. */
export function nilaiSlot(d: DataFormulir): Record<string, string> {
  const u = d.nilaiUjian ?? {};
  const angka = (n?: number) => (n === undefined ? "" : String(n).replace(".", ","));
  const kata = (n?: number) => (n === undefined ? "" : terbilang(n));
  const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  const ttl = [d.tempatLahir, d.tanggalLahir ? tanggalPanjang(d.tanggalLahir) : ""].filter(Boolean).join(", ");
  // Kolom jurusan di tanda terima sempit (182 pt), jadi cukup kode jurusan pilihan pertama.
  const jurusan = d.jurusan1?.kode ?? "";
  const tanggal = tanggalPanjang(d.dikirimPada);

  const tt = {
    Nomor: d.nomor,
    Jurusan: jurusan,
    Nama: d.namaLengkap,
    Sekolah: s(d.asalSekolah),
    Rt: s(d.rt),
    Rw: s(d.rw),
    Desa: s(d.desa),
    Kecamatan: s(d.kecamatan),
    Kabupaten: s(d.kabupaten),
    Datang: d.tanggalVerifikasi ?? "",
    Wangon: tanggal,
  };

  const hasil: Record<string, string> = {
    nomor: d.nomor,
    nama: d.namaLengkap,
    ttl,
    nisn: s(d.nisn),
    nik: s(d.nik),
    noKk: s(d.noKk),
    agama: s(d.agama),
    anakKe: s(d.anakKe),
    jumlahSaudara: s(d.jumlahSaudara),
    asalSekolah: s(d.asalSekolah),
    tamatTahun: s(d.tamatTahun),
    noIjazah: s(d.noIjazah),
    noHp: s(d.noHp),
    email: s(d.email),
    ayahNama: s(d.namaAyah),
    ayahTtl: ttlOrangTua(d.ayahTempatLahir, d.ayahTanggalLahir, d.ayahTtl),
    ayahPendidikan: s(d.ayahPendidikan),
    ayahPekerjaan: s(d.pekerjaanAyah),
    ibuNama: s(d.namaIbu),
    ibuTtl: ttlOrangTua(d.ibuTempatLahir, d.ibuTanggalLahir, d.ibuTtl),
    ibuPendidikan: s(d.ibuPendidikan),
    ibuPekerjaan: s(d.pekerjaanIbu),
    ortuRt: s(d.ortuRt),
    ortuRw: s(d.ortuRw),
    ortuDesa: s(d.ortuDesa),
    ortuKecamatan: s(d.ortuKecamatan),
    ortuKabupaten: s(d.ortuKabupaten),
    ortuPropinsi: s(d.ortuPropinsi),
    ortuNoHp: s(d.noHpOrtu),
    smpNama: s(d.asalSekolah),
    smpKecamatan: s(d.smpKecamatan),
    smpKabupaten: s(d.smpKabupaten),
    smpPropinsi: s(d.smpPropinsi),
    ijazahNomorTahun: s(d.ijazahNomorTahun),
    lamaBelajar: s(d.lamaBelajar),
    nilaiIndonesia: angka(u.b_indonesia),
    terbilangIndonesia: kata(u.b_indonesia),
    nilaiInggris: angka(u.b_inggris),
    terbilangInggris: kata(u.b_inggris),
    nilaiMatematika: angka(u.matematika),
    terbilangMatematika: kata(u.matematika),
    nilaiIpa: angka(u.ipa),
    terbilangIpa: kata(u.ipa),
    golonganDarah: s(d.golonganDarah),
    tinggiBadan: s(d.tinggiBadan),
    beratBadan: s(d.beratBadan),
    penyakit: s(d.penyakitPernahDiderita),
    hobiOlahraga: s(d.hobiOlahraga),
    hobiKesenian: s(d.hobiKesenian),
    hobiOrganisasi: s(d.hobiOrganisasi),
    hobiPrestasi: s(d.hobiPrestasi),
    hobiLain: s(d.hobiLain),
    tanggalSurat: tanggal,
    namaTtd: d.namaLengkap,
    referensi: s(d.referensiPendaftar),
  };
  for (const salinan of ["A", "B"]) for (const [k, v] of Object.entries(tt)) hasil[`tt${salinan}${k}`] = v;
  return hasil;
}

/** Buang karakter di luar himpunan huruf font standar (WinAnsi), hilangkan aksen. */
export function amankan(teks: string, font: PDFFont): string {
  const sah = new Set(font.getCharacterSet());
  return [...teks.normalize("NFC").replace(/\s+/g, " ").trim()]
    .map((c) => {
      if (sah.has(c.codePointAt(0) as number)) return c;
      const polos = c.normalize("NFD").replace(/[̀-ͯ]/g, "");
      return polos && sah.has(polos.codePointAt(0) as number) ? polos : "?";
    })
    .join("");
}

export function pas(font: PDFFont, teks: string, ukuranAwal: number, maks: number, min = UKURAN_MIN): { teks: string; ukuran: number } {
  let ukuran = ukuranAwal;
  while (ukuran > min && font.widthOfTextAtSize(teks, ukuran) > maks) ukuran = Math.round((ukuran - 0.25) * 100) / 100;
  let t = teks;
  while (t.length > 1 && font.widthOfTextAtSize(t, ukuran) > maks) t = t.slice(0, -1);
  return { teks: t, ukuran };
}

const Y = (y: number) => TINGGI_HALAMAN - y;

/** Kotak pas foto di template-dasar.pdf halaman 2 (koordinat PDF, sumbu Y dari bawah). */
const KOTAK_PAS_FOTO = { x: 286, bawah: 273.57, w: 68.5, h: 75 };

function tandai(page: PDFPage, k: Kotak, teks?: string, font?: PDFFont) {
  const tengahX = (k.x0 + k.x1) / 2;
  if (teks && font) {
    const w = font.widthOfTextAtSize(teks, 11);
    page.drawText(teks, { x: tengahX - w / 2, y: Y(k.y1) + 3.2, size: 11, font, color: rgb(0, 0, 0) });
    return;
  }
  // Tanda silang di dalam kotak.
  const m = 2.8;
  const garis = { thickness: 1.3, color: rgb(0, 0, 0) };
  page.drawLine({ start: { x: k.x0 + m, y: Y(k.y0 + m) }, end: { x: k.x1 - m, y: Y(k.y1 - m) }, ...garis });
  page.drawLine({ start: { x: k.x0 + m, y: Y(k.y1 - m) }, end: { x: k.x1 - m, y: Y(k.y0 + m) }, ...garis });
}

export async function buatFormulirPdf(d: DataFormulir): Promise<{ pdf: Uint8Array; jejak: Jejak[] }> {
  const dasar = await readFile(path.join(process.cwd(), "src/server/services/pdf/template-dasar.pdf"));
  const doc = await PDFDocument.load(dasar);
  const halaman = doc.getPages();
  if (halaman.length !== 3) throw new Error("Template formulir harus 3 halaman.");
  for (const p of halaman) {
    const { width, height } = p.getSize();
    if (Math.abs(width - LEBAR_HALAMAN) > 0.5 || Math.abs(height - TINGGI_HALAMAN) > 0.5) throw new Error("Ukuran halaman template berubah.");
  }

  const biasa = await doc.embedFont(StandardFonts.TimesRoman);
  const tebal = await doc.embedFont(StandardFonts.TimesRomanBold);
  const jejak: Jejak[] = [];
  const hitam = rgb(0, 0, 0);

  // Tahun pelajaran: tutup tahun contoh di template, gambar tahun sebenarnya dengan huruf yang sama.
  const [awal, akhir] = bagi(d.periode);
  if (awal && akhir) {
    for (const t of TAHUN_TEMPLATE) {
      const page = halaman[t.h - 1];
      page.drawRectangle({ x: t.x0 - 0.6, y: Y(t.y) - 3.2, width: t.x1 - t.x0 + 1.4, height: t.ukuran + 3.5, color: rgb(1, 1, 1) });
      page.drawText(`${awal}${t.pemisah}${akhir}`, { x: t.x0, y: Y(t.y), size: t.ukuran, font: tebal, color: hitam });
    }
  }

  // Isian teks.
  const nilai = nilaiSlot(d);
  const isi = (s: SlotTeks) => {
    const mentah = nilai[s.id];
    if (!mentah) return;
    const font = s.tebal ? tebal : biasa;
    const teksAman = amankan(s.asli ? mentah : mentah.toUpperCase(), font);
    if (!teksAman) return;
    const { teks, ukuran } = pas(font, teksAman, s.ukuran ?? UKURAN_BAWAAN, s.maks);
    const lebar = font.widthOfTextAtSize(teks, ukuran);
    const x = s.tengah ? s.x + (s.maks - lebar) / 2 : s.x;
    const y = s.y - 2.6;
    halaman[s.h - 1].drawText(teks, { x, y: Y(y), size: ukuran, font, color: hitam });
    jejak.push({ id: s.id, h: s.h, x, y: s.y, ukuran, teks });
  };
  for (const s of SLOT_TEKS) isi(s);

  // Kotak centang dan pilihan.
  const p1 = halaman[0];
  const p2 = halaman[1];
  if (d.jenisKelamin === "L" || d.jenisKelamin === "P") tandai(p1, KOTAK_GENDER[d.jenisKelamin]);
  if (d.penghasilan && /^\d{2}$/.test(d.penghasilan)) {
    tandai(p1, KOTAK_PENGHASILAN[0], d.penghasilan[0], biasa);
    tandai(p1, KOTAK_PENGHASILAN[1], d.penghasilan[1], biasa);
  }
  // Dua pilihan jurusan: kotak diberi angka 1 (pilihan pertama) dan 2 (pilihan kedua).
  if (d.jurusan1 && KOTAK_JURUSAN[d.jurusan1.kode]) tandai(p1, KOTAK_JURUSAN[d.jurusan1.kode], "1", tebal);
  if (d.jurusan2 && KOTAK_JURUSAN[d.jurusan2.kode]) tandai(p1, KOTAK_JURUSAN[d.jurusan2.kode], "2", tebal);
  if (d.ukuranSeragam && KOTAK_SERAGAM[d.ukuranSeragam]) tandai(p2, KOTAK_SERAGAM[d.ukuranSeragam]);

  // Pas foto: isi kotak "Pas photo 3 x 4" di template halaman 2 (kotak 68,5 x 75 pt; garis kotak tetap milik template).
  if (d.pasFoto && d.pasFoto.length > 0) {
    const jpeg = await sharp(Buffer.from(d.pasFoto)).rotate().resize({ height: 600, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    const gambar = await doc.embedJpg(jpeg);
    const k = KOTAK_PAS_FOTO;
    const skala = Math.max(k.w / gambar.width, k.h / gambar.height);
    const lebar = gambar.width * skala;
    const tinggi = gambar.height * skala;
    p2.pushOperators(pushGraphicsState(), rectangle(k.x + 0.8, k.bawah + 0.8, k.w - 1.6, k.h - 1.6), clip(), endPath());
    p2.drawImage(gambar, { x: k.x + (k.w - lebar) / 2, y: k.bawah + (k.h - tinggi) / 2, width: lebar, height: tinggi });
    p2.pushOperators(popGraphicsState());
  }

  return { pdf: await doc.save(), jejak };
}

// ------------------------------------------------------------------ pemuat data

type BarisPendaftar = NonNullable<Awaited<ReturnType<typeof cari>>>;

function cari(where: { aksesTokenHash: string } | { nomorPendaftaran: string }) {
  return prisma.pendaftar.findUnique({ where, include: { jurusan1: true, jurusan2: true } });
}

const buka = (v: string | null) => (v ? dekripsi(v) : null);

export function dataFormulirDari(p: BarisPendaftar, tanggalVerifikasi: string | null): DataFormulir {
  return {
    nomor: p.nomorPendaftaran,
    periode: p.periode,
    dikirimPada: p.createdAt,
    tanggalVerifikasi,
    namaLengkap: p.namaLengkap,
    tempatLahir: p.tempatLahir,
    tanggalLahir: p.tanggalLahir,
    nisn: p.nisn,
    nik: buka(p.nik),
    noKk: buka(p.noKk),
    jenisKelamin: p.jenisKelamin,
    agama: p.agama,
    anakKe: p.anakKe,
    jumlahSaudara: p.jumlahSaudara,
    asalSekolah: p.asalSekolah,
    tamatTahun: p.tamatTahun,
    noIjazah: p.noIjazah,
    noHp: buka(p.noHp),
    email: p.email,
    rt: p.rt,
    rw: p.rw,
    desa: p.desa,
    kecamatan: p.kecamatan,
    kabupaten: p.kabupaten,
    namaAyah: p.namaAyah,
    ayahTtl: p.ayahTtl,
    ayahPendidikan: p.ayahPendidikan,
    pekerjaanAyah: p.pekerjaanAyah,
    namaIbu: p.namaIbu,
    ayahTempatLahir: p.ayahTempatLahir,
    ayahTanggalLahir: p.ayahTanggalLahir,
    ibuTtl: p.ibuTtl,
    ibuTempatLahir: p.ibuTempatLahir,
    ibuTanggalLahir: p.ibuTanggalLahir,
    ibuPendidikan: p.ibuPendidikan,
    pekerjaanIbu: p.pekerjaanIbu,
    ortuRt: p.ortuRt,
    ortuRw: p.ortuRw,
    ortuDesa: p.ortuDesa,
    ortuKecamatan: p.ortuKecamatan,
    ortuKabupaten: p.ortuKabupaten,
    ortuPropinsi: p.ortuPropinsi,
    noHpOrtu: buka(p.noHpOrtu),
    penghasilan: p.penghasilan,
    referensiPendaftar: p.referensiPendaftar,
    smpKecamatan: p.smpKecamatan,
    smpKabupaten: p.smpKabupaten,
    smpPropinsi: p.smpPropinsi,
    ijazahNomorTahun: p.ijazahNomorTahun,
    lamaBelajar: p.lamaBelajar,
    nilaiUjian: p.nilaiUjian as DataFormulir["nilaiUjian"],
    golonganDarah: p.golonganDarah,
    tinggiBadan: p.tinggiBadan,
    beratBadan: p.beratBadan,
    penyakitPernahDiderita: p.penyakitPernahDiderita,
    hobiOlahraga: p.hobiOlahraga,
    hobiKesenian: p.hobiKesenian,
    hobiOrganisasi: p.hobiOrganisasi,
    hobiPrestasi: p.hobiPrestasi,
    hobiLain: p.hobiLain,
    ukuranSeragam: p.ukuranSeragam,
    jurusan1: p.jurusan1 ? { kode: p.jurusan1.kode, nama: p.jurusan1.nama } : null,
    jurusan2: p.jurusan2 ? { kode: p.jurusan2.kode, nama: p.jurusan2.nama } : null,
  };
}

/** Baca pas foto pendaftar dari Drive (bila sudah tersinkron) atau penyimpanan sementara. Gagal baca = formulir tanpa foto. */
async function muatPasFoto(p: BarisPendaftar): Promise<Uint8Array | null> {
  try {
    const meta = (p.berkasMeta ?? {}) as Record<string, { ref?: string } | undefined>;
    const idDrive = ((p.kustomFileIds ?? {}) as Record<string, unknown>).pas_foto;
    let aliran: AsyncIterable<Buffer | string> | null = null;
    if (typeof idDrive === "string" && idDrive) aliran = await (await penyimpananDokumen()).ambilStream(idDrive);
    else if (meta.pas_foto?.ref) {
      const temp = penyimpananTemp();
      if (await temp.ada(meta.pas_foto.ref)) aliran = await temp.ambilStream(meta.pas_foto.ref);
    }
    if (!aliran) return null;
    const potongan: Buffer[] = [];
    for await (const c of aliran) potongan.push(Buffer.from(c));
    return Buffer.concat(potongan);
  } catch {
    return null;
  }
}

async function formatTanggalVerifikasi(): Promise<string | null> {
  const v = await ambilPengaturan("tanggal_verifikasi_fisik");
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? tanggalPanjang(new Date(`${v}T00:00:00+07:00`)) : null;
}

/** PDF formulir untuk pemilik token akses (halaman sukses). Null bila token tidak dikenal. */
export async function formulirDariToken(aksesToken: string): Promise<{ pdf: Uint8Array; nomor: string } | null> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(aksesToken)) return null;
  const p = await cari({ aksesTokenHash: hashToken(aksesToken) });
  if (!p) return null;
  const { pdf } = await buatFormulirPdf({ ...dataFormulirDari(p, await formatTanggalVerifikasi()), pasFoto: await muatPasFoto(p) });
  return { pdf, nomor: p.nomorPendaftaran };
}

/** Untuk admin (A6): formulir berdasarkan nomor pendaftaran. */
export async function formulirDariNomor(nomor: string): Promise<{ pdf: Uint8Array; nomor: string } | null> {
  const p = await cari({ nomorPendaftaran: nomor });
  if (!p) return null;
  const { pdf } = await buatFormulirPdf({ ...dataFormulirDari(p, await formatTanggalVerifikasi()), pasFoto: await muatPasFoto(p) });
  return { pdf, nomor: p.nomorPendaftaran };
}
