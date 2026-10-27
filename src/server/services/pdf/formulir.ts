import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb, setCharacterSpacing, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { prisma } from "@/server/db/client";
import { dekripsi, hashToken } from "@/server/services/kripto";
import { penyimpananDokumen, penyimpananTemp } from "@/server/services/penyimpanan";
import { ambilPengaturan } from "@/server/services/pengaturan";

// PDF formulir pendaftaran (PRD v4 15.1, tampilan baru PRD 1.3 butir 79): digambar langsung dari kode, tanpa template
// Word. Isi dan urutan isian mengikuti docs/template-formulir.md (template lama); hanya tampilannya yang modern.
// Ukuran Folio 612,12 x 936,12 pt seperti sebelumnya. Koordinat atas-ke-bawah (seperti tampilan), diubah oleh `Y`.

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

/** Jejak setiap nilai isian yang digambar (halaman dan teks), dipakai test. */
export type Jejak = { h: number; teks: string };

const UKURAN_MIN = 6.5;

const tanggalPanjang = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(d).toUpperCase();

const ttlOrangTua = (tempat: string | null | undefined, tanggal: Date | null | undefined, lama: string | null | undefined) =>
  [tempat, tanggal ? tanggalPanjang(tanggal) : ""].filter(Boolean).join(", ") || lama || "";

/** Nilai teks tiap slot dari data pendaftar. String kosong = dilewati. */
export function nilaiSlot(d: DataFormulir): Record<string, string> {
  const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  const ttl = [d.tempatLahir, d.tanggalLahir ? tanggalPanjang(d.tanggalLahir) : ""].filter(Boolean).join(", ");
  // Kolom jurusan di tanda terima sempit (182 pt), jadi cukup kode jurusan pilihan pertama.
  const jurusan = d.jurusan1?.kode ?? "";
  const tanggal = tanggalPanjang(d.dikirimPada);

  const tt = {
    Nomor: [d.nomor, jurusan].filter(Boolean).join(" / "),
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
    lamaBelajar: s(d.lamaBelajar),
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

/** Kotak pas foto halaman 2: 3 x 4 (75 x 100 pt). Bagian dalamnya menentukan rasio olahan `siapkanPasFoto`. */
const KOTAK_PAS_FOTO = { w: 75, h: 100 };
export const DALAM_PAS_FOTO = { w: KOTAK_PAS_FOTO.w - 1.6, h: KOTAK_PAS_FOTO.h - 1.6 };

/**
 * Pas foto memenuhi kotak tanpa dipotong dan tanpa ditarik: foto utuh diletakkan di tengah di atas versi buram dirinya
 * sendiri yang diperbesar memenuhi kotak, jadi sisa ruang menyatu dengan latarnya (latar merah ikut merah, latar ruangan
 * ikut samar). Kotak template lebih lebar dari 3:4: foto 3x4 diberi sisi kiri dan kanan, foto mendatar sisi atas dan bawah.
 */
export async function siapkanPasFoto(isi: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(isi).rotate().resize({ height: 600, withoutEnlargement: true }).flatten({ background: "#ffffff" }).png().toBuffer({ resolveWithObject: true });
  const rasio = DALAM_PAS_FOTO.w / DALAM_PAS_FOTO.h;
  const kiriKanan = info.width / info.height < rasio;
  const W = kiriKanan ? Math.round(info.height * rasio) : info.width;
  const H = kiriKanan ? info.height : Math.round(info.width / rasio);
  const latar = await sharp(data).resize(W, H, { fit: "cover" }).blur(Math.max(8, Math.round(W / 25))).toBuffer();
  return sharp(latar)
    .composite([{ input: data, left: Math.round((W - info.width) / 2), top: Math.round((H - info.height) / 2) }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);

/** Palet situs (docs/design/DESIGN.md). */
const W = {
  ink: hex("#123524"),
  primer: hex("#387324"),
  primerTua: hex("#2C5A1C"),
  muda: hex("#85A947"),
  mint: hex("#C5D89D"),
  mintPucat: hex("#EEF3E2"),
  isian: hex("#FBFAF6"),
  garis: hex("#D6D0BF"),
  redup: hex("#5B6B4A"),
  /** Tulisan di atas latar terang hitam (permintaan sekolah), kecuali kop halaman 1; putih hanya di atas latar hijau. */
  hitam: rgb(0, 0, 0),
  putih: rgb(1, 1, 1),
};

const LEBAR = 612.12;
const TINGGI = 936.12;
const TEPI = 40;
/** Kepala halaman dinaikkan sejak gelombang atas dihapus: tepi atas isi 26 pt, bukan 66 pt. */
const NAIK = 40;
const KANAN = LEBAR - TEPI;
const Y = (y: number) => TINGGI - y;

type Huruf = { biasa: PDFFont; tebal: PDFFont; miring: PDFFont };

/** Persegi bersudut membulat sebagai path SVG (titik asal kiri atas, sumbu y ke bawah). */
const pathBulat = (w: number, h: number, r: number) =>
  `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;

class Kanvas {
  constructor(
    readonly page: PDFPage,
    readonly f: Huruf,
    readonly h: number,
    readonly jejak: Jejak[],
  ) {}

  kotak(x: number, y: number, w: number, h: number, o: { isi?: RGB; garis?: RGB; tebal?: number; r?: number; putus?: boolean } = {}) {
    this.page.drawSvgPath(pathBulat(w, h, o.r ?? 4), {
      x,
      y: Y(y),
      color: o.isi,
      borderColor: o.garis,
      borderWidth: o.garis ? (o.tebal ?? 0.6) : 0,
      borderDashArray: o.putus ? [4, 3] : undefined,
    });
  }

  teks(t: string, x: number, y: number, o: { ukuran?: number; font?: PDFFont; warna?: RGB; tengah?: boolean; kanan?: boolean; jarak?: number } = {}) {
    const font = o.font ?? this.f.biasa;
    const ukuran = o.ukuran ?? 10;
    const aman = amankan(t, font);
    if (!aman) return 0;
    const lebar = font.widthOfTextAtSize(aman, ukuran) + (o.jarak ?? 0) * (aman.length - 1);
    const x0 = o.tengah ? x - lebar / 2 : o.kanan ? x - lebar : x;
    // Jarak huruf lewat operator Tc agar teks tetap satu kata saat dicari atau disalin dari PDF.
    if (o.jarak) this.page.pushOperators(setCharacterSpacing(o.jarak));
    this.page.drawText(aman, { x: x0, y: Y(y), size: ukuran, font, color: o.warna ?? W.hitam });
    if (o.jarak) this.page.pushOperators(setCharacterSpacing(0));
    return lebar;
  }

  /** Teks di dalam lebar `maks`: mengecil sampai 7 pt, lalu dipotong bila masih terlalu panjang. */
  muat(t: string, x: number, y: number, maks: number, ukuran = 10, font = this.f.tebal) {
    let u = ukuran;
    let aman = amankan(t, font);
    while (u > 7 && font.widthOfTextAtSize(aman, u) > maks) u -= 0.25;
    while (aman.length > 1 && font.widthOfTextAtSize(aman, u) > maks) aman = aman.slice(0, -1);
    this.page.drawText(aman, { x, y: Y(y), size: u, font, color: W.hitam });
  }

  /** Kotak isian dengan nilai di dalamnya (nilai kosong = kotak kosong untuk ditulis tangan). */
  isian(x: number, y: number, w: number, mentah: string, o: { tinggi?: number; tengah?: boolean; asli?: boolean } = {}) {
    const h = o.tinggi ?? 18;
    this.kotak(x, y, w, h, { isi: W.isian, garis: W.garis });
    if (!mentah) return;
    // HURUF BESAR sesuai petunjuk formulir, kecuali email.
    const nilai = o.asli ? mentah : mentah.toUpperCase();
    this.jejak.push({ h: this.h, teks: nilai });
    if (o.tengah) {
      const u = 10;
      const lebar = this.f.tebal.widthOfTextAtSize(amankan(nilai, this.f.tebal), u);
      this.muat(nilai, x + Math.max(4, (w - lebar) / 2), y + h / 2 + 3.5, w - 8, u);
    } else this.muat(nilai, x + 7, y + h / 2 + 3.5, w - 14);
  }

  /** Kotak centang bersudut membulat; `tanda` = centang, atau teks pendek (mis. nomor pilihan jurusan). */
  centang(x: number, y: number, tanda: boolean | string, ukuran = 12) {
    const aktif = Boolean(tanda);
    this.kotak(x, y, ukuran, ukuran, { isi: aktif ? W.primer : W.putih, garis: aktif ? W.primer : W.redup, tebal: 0.9, r: 2.5 });
    if (tanda === true) {
      this.page.drawSvgPath(`M ${ukuran * 0.22} ${ukuran * 0.52} L ${ukuran * 0.42} ${ukuran * 0.72} L ${ukuran * 0.8} ${ukuran * 0.3}`, {
        x,
        y: Y(y),
        borderColor: W.putih,
        borderWidth: 1.6,
      });
    } else if (typeof tanda === "string" && tanda) {
      this.teks(tanda, x + ukuran / 2, y + ukuran - 2.8, { ukuran: 9, font: this.f.tebal, warna: W.putih, tengah: true });
    }
  }

  /** Judul bagian: pita mint dengan lencana huruf. */
  bagian(huruf: string, judul: string, y: number) {
    this.kotak(TEPI, y, KANAN - TEPI, 22, { isi: W.mintPucat, r: 6 });
    this.kotak(TEPI, y, 22, 22, { isi: W.primer, r: 6 });
    this.teks(huruf, TEPI + 11, y + 15.2, { ukuran: 11, font: this.f.tebal, warna: W.putih, tengah: true });
    this.teks(judul, TEPI + 32, y + 15, { ukuran: 10.5, font: this.f.tebal, warna: W.hitam, jarak: 0.6 });
  }

  /** Label baris bernomor di kolom kiri. */
  label(no: string, teks: string, y: number, x = TEPI + 6) {
    if (no) this.teks(no, x, y, { ukuran: 9.5, font: this.f.tebal, warna: W.hitam });
    this.teks(teks, x + (no ? 16 : 0), y, { ukuran: 9.5, warna: W.hitam });
  }
}

/** Gelombang hijau muda dan tua di bawah halaman (bagian atas polos, permintaan sekolah). */
function hiasan(k: Kanvas, nomorHalaman: number, total: number, tahun: string) {
  k.page.drawSvgPath(`M 0 30 C ${LEBAR * 0.3} 0 ${LEBAR * 0.65} 46 ${LEBAR} 14 V 46 H 0 Z`, { x: 0, y: 46, color: W.mint });
  k.page.drawSvgPath(`M 0 36 C ${LEBAR * 0.3} 10 ${LEBAR * 0.66} 50 ${LEBAR} 24 V 46 H 0 Z`, { x: 0, y: 46, color: W.primer });
  k.teks(`SMK Ma’arif NU 1 Wangon  ·  Formulir SPMB ${tahun}`, TEPI, TINGGI - 6, { ukuran: 7.5, font: k.f.tebal, warna: W.putih });
  k.teks(`Halaman ${nomorHalaman} dari ${total}`, KANAN, TINGGI - 6, { ukuran: 7.5, font: k.f.tebal, warna: W.putih, kanan: true });
}

/** Kop sekolah: logo NU kiri, logo sekolah kanan, identitas di tengah. Mengembalikan y bawah kop. */
function kop(k: Kanvas, logo: { nu: PDFImage; sekolah: PDFImage }) {
  const tengah = LEBAR / 2;
  const nu = logo.nu.scaleToFit(78, 48);
  k.page.drawImage(logo.nu, { x: TEPI, y: Y(66 - NAIK + nu.height), width: nu.width, height: nu.height });
  const sk = logo.sekolah.scaleToFit(52, 52);
  k.page.drawImage(logo.sekolah, { x: KANAN - sk.width, y: Y(64 - NAIK + sk.height), width: sk.width, height: sk.height });
  k.teks("LEMBAGA PENDIDIKAN MA’ARIF NU PCNU KAB. BANYUMAS", tengah, 76 - NAIK, { ukuran: 8, font: k.f.tebal, warna: W.primer, tengah: true, jarak: 0.5 });
  k.teks("SMK MA’ARIF NU 1 WANGON", tengah, 96 - NAIK, { ukuran: 19, font: k.f.tebal, warna: W.ink, tengah: true });
  k.teks("Jl. Karangjengkol RT.02/RW.04 Wangon, Banyumas 53176  ·  Telp. (0281) 513425", tengah, 110 - NAIK, { ukuran: 8, warna: W.redup, tengah: true });
  k.teks("smk_maarifnu1wgn@yahoo.co.id  ·  www.smkmanu1wangon.sch.id", tengah, 121 - NAIK, { ukuran: 8, warna: W.redup, tengah: true });
  k.page.drawLine({ start: { x: TEPI, y: Y(132 - NAIK) }, end: { x: KANAN, y: Y(132 - NAIK) }, thickness: 1.6, color: W.primer });
  k.page.drawLine({ start: { x: TEPI, y: Y(135 - NAIK) }, end: { x: KANAN, y: Y(135 - NAIK) }, thickness: 0.6, color: W.muda });
  return 135 - NAIK;
}

const PENGHASILAN = [
  ["01", "< 500.000"],
  ["02", "500.000 – 999.999"],
  ["03", "1.000.000 – 1.999.999"],
  ["04", "2.000.000 – 4.999.999"],
  ["05", "> 5.000.000"],
] as const;

const JURUSAN = [
  ["AKL", "AKUNTANSI DAN KEUANGAN LEMBAGA (AKL)"],
  ["MPLB", "MANAJEMEN PERKANTORAN & LAYANAN BISNIS (MPLB)"],
  ["LPK3", "LP. KEFARMASIAN KLINIS DAN KOMUNITAS (LPKKK)"],
  ["TKR", "TEKNIK KENDARAAN RINGAN (TKR)"],
] as const;

/** Halaman 1: kop, judul, dan bagian A Keterangan Diri Murid Baru. */
function halamanSatu(k: Kanvas, d: DataFormulir, n: Record<string, string>, logo: { nu: PDFImage; sekolah: PDFImage }, tahun: string) {
  let y = kop(k, logo) + 26;
  const tengah = LEBAR / 2;
  k.teks("FORMULIR SISTEM PENERIMAAN MURID BARU", tengah, y, { ukuran: 14.5, font: k.f.tebal, warna: W.hitam, tengah: true, jarak: 0.4 });
  y += 10;

  // Pil tahun pelajaran dan kartu nomor pendaftaran sejajar.
  const teksTahun = `TAHUN PELAJARAN ${tahun}`;
  const lebarTahun = k.f.tebal.widthOfTextAtSize(teksTahun, 8.5) + 22;
  const lebarNomor = 186;
  const kiri = tengah - (lebarTahun + 10 + lebarNomor) / 2;
  k.kotak(kiri, y, lebarTahun, 22, { isi: W.mint, r: 11 });
  k.teks(teksTahun, kiri + lebarTahun / 2, y + 14.5, { ukuran: 8.5, font: k.f.tebal, warna: W.hitam, tengah: true });
  const xNomor = kiri + lebarTahun + 10;
  k.kotak(xNomor, y, lebarNomor, 22, { isi: W.ink, r: 11 });
  k.teks("NO. PENDAFTARAN", xNomor + 12, y + 14.3, { ukuran: 7, font: k.f.tebal, warna: W.mint, jarak: 0.4 });
  k.teks(n.nomor, xNomor + lebarNomor - 12, y + 14.8, { ukuran: 10.5, font: k.f.tebal, warna: W.putih, kanan: true });
  y += 36;
  k.teks("Harap diisi dengan huruf besar dan jelas", tengah, y, { ukuran: 8, font: k.f.miring, warna: W.hitam, tengah: true });
  y += 12;

  k.bagian("A", "KETERANGAN DIRI MURID BARU", y);
  y += 32;

  const xIsi = 214;
  const lebarIsi = KANAN - xIsi;
  const baris = (no: string, label: string, nilai: string, asli = false) => {
    k.label(no, label, y + 12.5);
    k.isian(xIsi, y, lebarIsi, nilai, { asli });
    y += 23;
  };

  baris("1.", "Nama Lengkap Murid Baru", n.nama);
  baris("2.", "Tempat / Tanggal Lahir", n.ttl);
  baris("3.", "NISN", n.nisn);
  // NIK & No KK: dua kotak berdampingan.
  k.label("4.", "NIK & No KK", y + 12.5);
  const separuh = (lebarIsi - 18) / 2;
  k.isian(xIsi, y, separuh, n.nik);
  k.teks("&", xIsi + separuh + 9, y + 12.5, { ukuran: 10, font: k.f.tebal, warna: W.hitam, tengah: true });
  k.isian(xIsi + separuh + 18, y, separuh, n.noKk);
  y += 23;
  // Jenis kelamin: dua pilihan.
  k.label("5.", "Jenis Kelamin", y + 12.5);
  k.centang(xIsi, y + 3, d.jenisKelamin === "L");
  k.teks("Laki – laki", xIsi + 18, y + 13, { ukuran: 9.5 });
  k.centang(xIsi + 110, y + 3, d.jenisKelamin === "P");
  k.teks("Perempuan", xIsi + 128, y + 13, { ukuran: 9.5 });
  y += 23;
  baris("6.", "Agama", n.agama);
  baris("7.", "Anak ke berapa", n.anakKe);
  baris("8.", "Jumlah saudara kandung", n.jumlahSaudara);
  baris("9.", "Asal Sekolah", n.asalSekolah);
  baris("10.", "Tamat SMP / MTs Tahun", n.tamatTahun);
  baris("11.", "No Telepon Murid", n.noHp);
  baris("12.", "Email", n.email, true);

  // Orang tua: kartu Ayah dan Ibu berdampingan.
  k.label("13.", "Orang Tua", y + 12.5);
  y += 20;
  const lebarKartu = (KANAN - TEPI - 12) / 2;
  for (const [i, [judul, awalan]] of ([["a. Ayah", "ayah"], ["b. Ibu", "ibu"]] as const).entries()) {
    const x = TEPI + i * (lebarKartu + 12);
    k.kotak(x, y, lebarKartu, 104, { garis: W.garis, r: 8 });
    k.teks(judul, x + 10, y + 15, { ukuran: 9.5, font: k.f.tebal, warna: W.hitam });
    const isi: [string, string][] = [
      ["Nama", n[`${awalan}Nama`]],
      ["TTL", n[`${awalan}Ttl`]],
      ["Pendidikan", n[`${awalan}Pendidikan`]],
      ["Pekerjaan", n[`${awalan}Pekerjaan`]],
    ];
    isi.forEach(([lbl, v], j) => {
      const yb = y + 22 + j * 20;
      k.teks(lbl, x + 10, yb + 11.5, { ukuran: 8.5, warna: W.hitam });
      k.isian(x + 66, yb, lebarKartu - 76, v, { tinggi: 16 });
    });
  }
  y += 116;

  // Alamat orang tua / wali.
  k.label("14.", "Alamat Orangtua / Wali", y + 12.5);
  k.teks("RT", xIsi, y + 12.5, { ukuran: 8.5, warna: W.hitam });
  k.isian(xIsi + 16, y, 36, n.ortuRt, { tengah: true });
  k.teks("RW", xIsi + 60, y + 12.5, { ukuran: 8.5, warna: W.hitam });
  k.isian(xIsi + 78, y, 36, n.ortuRw, { tengah: true });
  k.teks("Desa", xIsi + 124, y + 12.5, { ukuran: 8.5, warna: W.hitam });
  k.isian(xIsi + 148, y, lebarIsi - 148, n.ortuDesa);
  y += 22;
  const xLbl = xIsi;
  for (const [lbl, v] of [
    ["Kecamatan", n.ortuKecamatan],
    ["Kabupaten", n.ortuKabupaten],
    ["Propinsi", n.ortuPropinsi],
    ["No. Telepon Wali", n.ortuNoHp],
  ] as const) {
    k.teks(lbl, xLbl, y + 12.5, { ukuran: 8.5, warna: W.hitam });
    k.isian(xLbl + 76, y, lebarIsi - 76, v);
    y += 22;
  }
  y += 2;

  // Penghasilan bulanan: lima pilihan berkode.
  k.label("15.", "Penghasilan Bulanan", y + 12.5);
  const kode = d.penghasilan ?? "";
  PENGHASILAN.forEach(([kd, teks], i) => {
    const kol = i % 3;
    const brs = Math.floor(i / 3);
    const x = xIsi + kol * (lebarIsi / 3);
    const yb = y + brs * 19;
    k.centang(x, yb + 3, kode === kd);
    k.teks(`${kd}).`, x + 16, yb + 12.5, { ukuran: 8, font: k.f.tebal, warna: W.hitam });
    k.teks(teks, x + 33, yb + 12.5, { ukuran: 8 });
  });
  y += 44;

  // Jurusan: nomor pilihan di dalam kotak.
  k.label("16.", "Jurusan yang dipilih", y + 12.5);
  JURUSAN.forEach(([kd, teks], i) => {
    const pilihan = d.jurusan1?.kode === kd ? "1" : d.jurusan2?.kode === kd ? "2" : "";
    const yb = y + i * 19;
    k.centang(xIsi, yb + 2, pilihan, 13);
    k.teks(teks, xIsi + 20, yb + 12.5, { ukuran: 8.8, font: k.f.tebal, warna: W.hitam });
  });
}

/** Kepala ringkas halaman 2: identitas sekolah dan nomor pendaftaran. Mengembalikan y bawahnya. */
function kepalaRingkas(k: Kanvas, n: Record<string, string>, logo: PDFImage) {
  const l = logo.scaleToFit(30, 30);
  k.page.drawImage(logo, { x: TEPI, y: Y(62 - NAIK + l.height), width: l.width, height: l.height });
  k.teks("FORMULIR SISTEM PENERIMAAN MURID BARU", TEPI + 40, 76 - NAIK, { ukuran: 9.5, font: k.f.tebal, warna: W.hitam, jarak: 0.3 });
  k.teks("SMK MA’ARIF NU 1 WANGON", TEPI + 40, 88 - NAIK, { ukuran: 8, warna: W.hitam });
  const lebar = 196;
  k.kotak(KANAN - lebar, 66 - NAIK, lebar, 22, { isi: W.ink, r: 11 });
  k.teks("NO. PENDAFTARAN", KANAN - lebar + 12, 80.3 - NAIK, { ukuran: 7, font: k.f.tebal, warna: W.mint, jarak: 0.4 });
  k.teks(n.nomor, KANAN - 12, 80.8 - NAIK, { ukuran: 10, font: k.f.tebal, warna: W.putih, kanan: true });
  k.page.drawLine({ start: { x: TEPI, y: Y(100 - NAIK) }, end: { x: KANAN, y: Y(100 - NAIK) }, thickness: 0.6, color: W.muda });
  return 100 - NAIK;
}

const SERAGAM = ["M", "L", "XL", "XXL", "XXXL", "Jumbo"] as const;

/** Halaman 2: bagian B, C, D, tanda tangan dan pas foto, serta kotak referensi pendaftar. */
function halamanDua(k: Kanvas, d: DataFormulir, n: Record<string, string>, logo: PDFImage, pasFoto: PDFImage | null) {
  let y = kepalaRingkas(k, n, logo) + 16;
  const xIsi = 214;
  const lebarIsi = KANAN - xIsi;
  const xSub = TEPI + 22;
  const baris = (no: string, label: string, nilai: string, x = TEPI + 6) => {
    k.label(no, label, y + 12.5, x);
    k.isian(xIsi, y, lebarIsi, nilai);
    y += 23;
  };

  k.bagian("B", "KETERANGAN PENDIDIKAN", y);
  y += 32;
  k.label("1.", "Asal Sekolah", y + 12.5);
  y += 21;
  baris("a.", "SMP / MTs.", n.smpNama, xSub);
  baris("", "Kecamatan", n.smpKecamatan, xSub + 16);
  baris("", "Kabupaten", n.smpKabupaten, xSub + 16);
  baris("", "Propinsi", n.smpPropinsi, xSub + 16);
  k.label("b.", "Lama belajar", y + 12.5, xSub);
  k.isian(xIsi, y, 46, n.lamaBelajar, { tengah: true });
  k.teks("Tahun", xIsi + 54, y + 12.5, { ukuran: 9.5 });
  y += 34;

  k.bagian("C", "KETERANGAN KESEHATAN", y);
  y += 32;
  baris("1.", "Golongan darah", n.golonganDarah);
  k.label("2.", "Tinggi dan berat badan", y + 12.5);
  k.isian(xIsi, y, 70, n.tinggiBadan, { tengah: true });
  k.teks("cm, dan", xIsi + 78, y + 12.5, { ukuran: 9.5 });
  k.isian(xIsi + 120, y, 70, n.beratBadan, { tengah: true });
  k.teks("kg", xIsi + 198, y + 12.5, { ukuran: 9.5 });
  y += 23;
  baris("3.", "Penyakit yang pernah diderita", n.penyakit);
  y += 11;

  k.bagian("D", "KETERANGAN LAIN - LAIN", y);
  y += 32;
  k.label("1.", "Kegemaran / Hobi / Prestasi murid baru", y + 12.5);
  y += 21;
  baris("a.", "Olah raga", n.hobiOlahraga, xSub);
  baris("b.", "Kesenian", n.hobiKesenian, xSub);
  baris("c.", "Keorganisasian", n.hobiOrganisasi, xSub);
  baris("d.", "Prestasi yang pernah diraih", n.hobiPrestasi, xSub);
  baris("e.", "Lain – Lain", n.hobiLain, xSub);
  k.label("2.", "Ukuran Baju / Seragam", y + 12.5);
  let x = xIsi;
  for (const u of SERAGAM) {
    k.centang(x, y + 3, d.ukuranSeragam === u);
    const w = k.teks(u, x + 17, y + 13, { ukuran: 9.5, font: k.f.tebal, warna: W.hitam });
    x += 17 + w + 16;
  }
  y += 40;

  // Pas foto 3x4 di kiri, tanda tangan murid di kanan.
  const foto = KOTAK_PAS_FOTO;
  const xFoto = TEPI + 40;
  k.kotak(xFoto, y, foto.w, foto.h, { isi: W.isian, garis: W.garis, r: 3 });
  if (pasFoto) {
    k.page.drawImage(pasFoto, { x: xFoto + 0.8, y: Y(y + foto.h - 0.8), width: foto.w - 1.6, height: foto.h - 1.6 });
  } else {
    k.teks("Pas photo", xFoto + foto.w / 2, y + foto.h / 2 - 2, { ukuran: 8.5, warna: W.hitam, tengah: true });
    k.teks("3 x 4", xFoto + foto.w / 2, y + foto.h / 2 + 10, { ukuran: 8.5, warna: W.hitam, tengah: true });
  }
  const xTtd = 360;
  const tengahTtd = xTtd + (KANAN - xTtd) / 2;
  k.teks("Wangon,", xTtd, y + 12.5, { ukuran: 9.5 });
  k.isian(xTtd + 40, y, KANAN - xTtd - 40, n.tanggalSurat);
  k.teks("Murid Baru,", tengahTtd, y + 40, { ukuran: 9.5, tengah: true });
  k.teks(`( ${n.namaTtd.toUpperCase()} )`, tengahTtd, y + 96, { ukuran: 9.5, font: k.f.tebal, tengah: true });
  y += foto.h + 24;

  // Kotak referensi dan petugas pendaftaran (diisi panitia).
  const lebarKotak = KANAN - TEPI - 150;
  k.kotak(TEPI, y, lebarKotak, 116, { garis: W.redup, tebal: 0.8, r: 8, putus: true });
  const xr = TEPI + 14;
  const xv = TEPI + 128;
  const lv = lebarKotak - 142;
  k.teks("Referensi Pendaftar", xr, y + 24, { ukuran: 9.5 });
  k.isian(xv, y + 11, lv, n.referensi);
  k.teks("(Dari siapa / dari mana informasi pendaftaran yang di dapatkan oleh calon murid baru)", xr, y + 42, {
    ukuran: 7.5,
    font: k.f.miring,
    warna: W.hitam,
  });
  k.teks("Petugas Pendaftaran", xr, y + 66, { ukuran: 9.5 });
  k.isian(xv, y + 53, lv, "");
  k.teks("Tanda Tangan", xr, y + 98, { ukuran: 9.5 });
  k.isian(xv, y + 85, lv, "", { tinggi: 22 });
}

const BERKAS = [
  ["AKTE ASLI / IJAZAH SD/MI", "1 lembar"],
  ["FOTOKOPI AKTE KELAHIRAN", "1 lembar"],
  ["FOTOKOPI KARTU KELUARGA", "1 lembar"],
  ["FOTOKOPI KIP/KIS/PKH", "1 lembar"],
  ["FOTOKOPI KTP ORANG TUA", "2 lembar"],
  ["PAS FOTO 3 X 4", "2 lembar"],
  ["SURAT KETERANGAN LULUS (SKL)", "1 lembar"],
  ["FOTOKOPI IJAZAH MTs/SMP", "1 lembar"],
] as const;

/** Satu lembar tanda terima berkas, mulai dari y `atas`. Halaman 3 memuat dua lembar identik. */
function tandaTerima(k: Kanvas, n: Record<string, string>, s: "A" | "B", atas: number, tahun: string, logo: PDFImage) {
  let y = atas;
  const l = logo.scaleToFit(34, 34);
  k.page.drawImage(logo, { x: TEPI, y: Y(y + l.height), width: l.width, height: l.height });
  k.teks("TANDA TERIMA", TEPI + 44, y + 14, { ukuran: 13, font: k.f.tebal, warna: W.hitam, jarak: 0.6 });
  k.teks(`BERKAS PERSYARATAN MURID BARU  ·  SMK MA’ARIF NU 1 WANGON TAHUN PELAJARAN ${tahun.replace("/", " / ")}`, TEPI + 44, y + 28, {
    ukuran: 7.8,
    font: k.f.tebal,
    warna: W.hitam,
  });
  y += 46;

  const xIsi = 178;
  const lebarIsi = KANAN - xIsi;
  const baris = (label: string, nilai: string) => {
    k.teks(label, TEPI + 6, y + 12.5, { ukuran: 9 });
    k.isian(xIsi, y, lebarIsi, nilai, { tinggi: 17 });
    y += 21;
  };
  baris("No Pendaftaran / Jurusan", n[`tt${s}Nomor`]);
  baris("Nama Murid Baru", n[`tt${s}Nama`]);
  baris("Asal Sekolah", n[`tt${s}Sekolah`]);
  k.teks("Alamat Murid Baru", TEPI + 6, y + 12.5, { ukuran: 9 });
  k.teks("RT", xIsi, y + 12.5, { ukuran: 8.5, warna: W.hitam });
  k.isian(xIsi + 16, y, 36, n[`tt${s}Rt`], { tinggi: 17, tengah: true });
  k.teks("RW", xIsi + 60, y + 12.5, { ukuran: 8.5, warna: W.hitam });
  k.isian(xIsi + 78, y, 36, n[`tt${s}Rw`], { tinggi: 17, tengah: true });
  k.teks("Desa", xIsi + 124, y + 12.5, { ukuran: 8.5, warna: W.hitam });
  k.isian(xIsi + 148, y, lebarIsi - 148, n[`tt${s}Desa`], { tinggi: 17 });
  y += 21;
  baris("Kecamatan", n[`tt${s}Kecamatan`]);
  baris("Kabupaten", n[`tt${s}Kabupaten`]);
  y += 4;

  // Daftar berkas dua kolom, tiap baris dengan kotak centang untuk panitia.
  const lebarKol = (KANAN - TEPI) / 2;
  BERKAS.forEach(([nama, jumlah], i) => {
    const x = TEPI + (i % 2) * lebarKol;
    const yb = y + Math.floor(i / 2) * 18;
    k.centang(x + 6, yb + 2, false, 11);
    k.teks(`${i + 1}. ${nama}`, x + 23, yb + 11, { ukuran: 8.3 });
    k.teks(jumlah, x + lebarKol - 14, yb + 11, { ukuran: 8.3, font: k.f.tebal, warna: W.hitam, kanan: true });
  });
  y += 80;

  // Jadwal datang di kiri, tanda tangan panitia di kanan.
  k.kotak(TEPI, y, 300, 40, { isi: W.mintPucat, r: 8 });
  k.teks("Harap datang di SMK Ma’arif NU 1 Wangon tanggal :", TEPI + 12, y + 16, { ukuran: 8.5 });
  const datang = n[`tt${s}Datang`];
  k.teks(datang ? datang.toUpperCase() : "..........................................", TEPI + 12, y + 31, { ukuran: 9.5, font: k.f.tebal });
  const xTtd = 400;
  const tengahTtd = xTtd + (KANAN - xTtd) / 2;
  k.teks(`Wangon, ${n[`tt${s}Wangon`].toUpperCase()}`, tengahTtd, y + 10, { ukuran: 9, tengah: true });
  k.teks("PANITIA SPMB", tengahTtd, y + 24, { ukuran: 9, font: k.f.tebal, tengah: true });
  k.page.drawLine({ start: { x: xTtd + 10, y: Y(y + 70) }, end: { x: KANAN - 10, y: Y(y + 70) }, thickness: 0.8, color: W.ink });
}

/** Halaman 3: dua lembar tanda terima dipisah garis potong. */
function halamanTiga(k: Kanvas, n: Record<string, string>, tahun: string, logo: PDFImage) {
  tandaTerima(k, n, "A", 66 - NAIK, tahun, logo);
  const potong = 436;
  k.page.drawLine({ start: { x: TEPI - 10, y: Y(potong) }, end: { x: KANAN + 10, y: Y(potong) }, thickness: 0.8, color: W.redup, dashArray: [5, 4] });
  k.kotak(LEBAR / 2 - 54, potong - 8, 108, 16, { isi: W.putih, r: 8 });
  k.teks("gunting di sini", LEBAR / 2, potong + 3.5, { ukuran: 7.5, font: k.f.miring, warna: W.hitam, tengah: true });
  tandaTerima(k, n, "B", potong + 22, tahun, logo);
}

export async function buatFormulirPdf(d: DataFormulir): Promise<{ pdf: Uint8Array; jejak: Jejak[] }> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Formulir SPMB ${d.nomor}`);
  doc.setAuthor("SMK Ma'arif NU 1 Wangon");
  const f: Huruf = {
    biasa: await doc.embedFont(StandardFonts.Helvetica),
    tebal: await doc.embedFont(StandardFonts.HelveticaBold),
    miring: await doc.embedFont(StandardFonts.HelveticaOblique),
  };
  const logo = {
    nu: await doc.embedPng(await readFile(path.join(process.cwd(), "src/server/services/pdf/logo-nu.png"))),
    sekolah: await doc.embedPng(await readFile(path.join(process.cwd(), "public/images/sekolah/logo-sekolah.png"))),
  };
  const tahun = d.periode;
  const n = nilaiSlot(d);
  const jejak: Jejak[] = [];

  const k1 = new Kanvas(doc.addPage([LEBAR, TINGGI]), f, 1, jejak);
  hiasan(k1, 1, 3, tahun);
  halamanSatu(k1, d, n, logo, tahun);

  const pasFoto = d.pasFoto && d.pasFoto.length > 0 ? await doc.embedJpg(await siapkanPasFoto(Buffer.from(d.pasFoto))) : null;
  const k2 = new Kanvas(doc.addPage([LEBAR, TINGGI]), f, 2, jejak);
  hiasan(k2, 2, 3, tahun);
  halamanDua(k2, d, n, logo.sekolah, pasFoto);

  const k3 = new Kanvas(doc.addPage([LEBAR, TINGGI]), f, 3, jejak);
  hiasan(k3, 3, 3, tahun);
  halamanTiga(k3, n, tahun, logo.sekolah);

  return { pdf: await doc.save(), jejak };
}

// ------------------------------------------------------------------ pemuat data

type BarisPendaftar = NonNullable<Awaited<ReturnType<typeof cari>>>;

function cari(where: { aksesTokenHash: string } | { nomorPendaftaran: string } | { id: bigint }) {
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

/** Unduh ulang dari Cek Pendaftaran (poin D): ID pendaftar dari sesi yang sudah diverifikasi. Null bila tidak dikenal. */
export async function formulirDariId(id: string): Promise<{ pdf: Uint8Array; nomor: string } | null> {
  if (!/^\d{1,18}$/.test(id)) return null;
  const p = await cari({ id: BigInt(id) });
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
