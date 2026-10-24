import ExcelJS from "exceljs";
import { kondisiPeserta, type FilterPeserta } from "@/server/services/pencarianPeserta";
import { prisma } from "@/server/db/client";
import { muatDefinisiField } from "@/server/services/draf";
import { bukaAman } from "@/server/services/pendaftarKolom";
import type { DefinisiField } from "@/server/validasi/wizard";
import { GalatApi } from "@/server/types/galat";

// Ekspor XLSX pendaftar (PRD v3.1 15.2): semua kolom Bagian A-D, alamat terurai, dan isian kustom. Tanpa kolom status
// (semua pendaftar langsung diterima, PRD 1.3 butir 63) dan tanpa nilai rapor maupun saran jurusan (butir 65). Header hijau NU, NIK/NISN/HP sebagai teks supaya angka nol depan aman.

export const MAKS_BARIS_EKSPOR = 10_000;
const HIJAU = "FF057A3C";
const LATAR_JUDUL = "FFE8F3EC";

type Sel = string | number | Date | null;
type Kolom = { header: string; lebar?: number; teks?: boolean; format?: string; nilai: (p: Baris) => Sel };
type Baris = Awaited<ReturnType<typeof ambilBatch>>[number];

const ambilBatch = (where: ReturnType<typeof kondisiPeserta>, ambil: number, setelah?: bigint) =>
  prisma.pendaftar.findMany({
    where: { AND: [where, ...(setelah ? [{ id: { gt: setelah } }] : [])] },
    orderBy: { id: "asc" },
    take: ambil,
    include: { jurusan1: true, jurusan2: true, gelombang: true },
  });

const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const tgl = (d: Date | null) => d;

export async function buatXlsx(filter: FilterPeserta, periodeAktif: string): Promise<{ buffer: Buffer; jumlah: number }> {
  const where = kondisiPeserta(filter, periodeAktif);
  const total = await prisma.pendaftar.count({ where });
  if (total > MAKS_BARIS_EKSPOR) throw GalatApi.validasi({ _: [`Terlalu banyak data (${total}). Persempit filter hingga maksimal ${MAKS_BARIS_EKSPOR} baris.`] });

  const fields = await muatDefinisiField();
  const label = (kunci: string, v: unknown): string => {
    const f = fields.find((x) => x.kunci === kunci);
    return f?.opsi?.find((o) => o.nilai === v)?.label ?? str(v);
  };
  const kustom = fields.filter((f: DefinisiField) => f.kunci.startsWith("kustom_") && f.tipe !== "file");

  const jk = (p: Baris) => (p.jenisKelamin ? label("jenis_kelamin", p.jenisKelamin) : "");
  const ujian = (p: Baris, k: string) => ((p.nilaiUjian ?? {}) as Record<string, number>)[k] ?? null;

  const kolom: Kolom[] = [
    { header: "No. Pendaftaran", lebar: 18, nilai: (p) => p.nomorPendaftaran },
    { header: "Tanggal Daftar", lebar: 18, format: "dd/mm/yyyy hh:mm", nilai: (p) => p.createdAt },
    { header: "Periode", lebar: 11, nilai: (p) => p.periode },
    { header: "Gelombang", lebar: 14, nilai: (p) => p.gelombang?.nama ?? "" },
    { header: "Sumber", lebar: 9, nilai: (p) => p.sumber },
    { header: "Catatan Panitia", lebar: 28, nilai: (p) => p.catatanPenolakan ?? p.catatanVerifikasi ?? "" },
    { header: "Pilihan Jurusan 1", lebar: 12, nilai: (p) => p.jurusan1?.kode ?? "" },
    { header: "Pilihan Jurusan 2", lebar: 12, nilai: (p) => p.jurusan2?.kode ?? "" },
    { header: "Nama Lengkap", lebar: 28, nilai: (p) => p.namaLengkap },
    { header: "Tempat Lahir", lebar: 16, nilai: (p) => str(p.tempatLahir) },
    { header: "Tanggal Lahir", lebar: 13, format: "dd/mm/yyyy", nilai: (p) => tgl(p.tanggalLahir) },
    { header: "NISN", lebar: 13, teks: true, nilai: (p) => str(p.nisn) },
    { header: "NIK", lebar: 19, teks: true, nilai: (p) => bukaAman(p.nik) ?? "" },
    { header: "No. KK", lebar: 19, teks: true, nilai: (p) => bukaAman(p.noKk) ?? "" },
    { header: "Jenis Kelamin", lebar: 13, nilai: jk },
    { header: "Agama", lebar: 10, nilai: (p) => str(p.agama) },
    { header: "Anak Ke", lebar: 8, nilai: (p) => p.anakKe },
    { header: "Jumlah Saudara", lebar: 10, nilai: (p) => p.jumlahSaudara },
    { header: "Asal Sekolah", lebar: 26, nilai: (p) => str(p.asalSekolah) },
    { header: "Tahun Tamat", lebar: 11, teks: true, nilai: (p) => str(p.tamatTahun) },
    { header: "No. Ijazah", lebar: 22, teks: true, nilai: (p) => str(p.noIjazah) },
    { header: "No. HP", lebar: 16, teks: true, nilai: (p) => bukaAman(p.noHp) ?? "" },
    { header: "No. WhatsApp", lebar: 16, teks: true, nilai: (p) => bukaAman(p.noWa) ?? "" },
    { header: "Email", lebar: 26, nilai: (p) => str(p.email) },
    { header: "Alamat", lebar: 30, nilai: (p) => str(p.alamat) },
    { header: "RT", lebar: 6, teks: true, nilai: (p) => str(p.rt) },
    { header: "RW", lebar: 6, teks: true, nilai: (p) => str(p.rw) },
    { header: "Desa/Kelurahan", lebar: 18, nilai: (p) => str(p.desa) },
    { header: "Kecamatan", lebar: 16, nilai: (p) => str(p.kecamatan) },
    { header: "Kabupaten/Kota", lebar: 16, nilai: (p) => str(p.kabupaten) },
    { header: "Provinsi", lebar: 14, nilai: (p) => str(p.propinsi) },
    { header: "Nama Ayah", lebar: 24, nilai: (p) => str(p.namaAyah) },
    { header: "NIK Ayah", lebar: 19, teks: true, nilai: (p) => bukaAman(p.nikAyah) ?? "" },
    { header: "Tempat Lahir Ayah", lebar: 20, nilai: (p) => str(p.ayahTempatLahir) },
    { header: "Tanggal Lahir Ayah", lebar: 16, format: "dd/mm/yyyy", nilai: (p) => tgl(p.ayahTanggalLahir) },
    { header: "TTL Ayah", lebar: 24, nilai: (p) => str(p.ayahTtl) },
    { header: "Pendidikan Ayah", lebar: 16, nilai: (p) => str(p.ayahPendidikan) },
    { header: "Pekerjaan Ayah", lebar: 16, nilai: (p) => str(p.pekerjaanAyah) },
    { header: "Nama Ibu", lebar: 24, nilai: (p) => str(p.namaIbu) },
    { header: "NIK Ibu", lebar: 19, teks: true, nilai: (p) => bukaAman(p.nikIbu) ?? "" },
    { header: "Tempat Lahir Ibu", lebar: 20, nilai: (p) => str(p.ibuTempatLahir) },
    { header: "Tanggal Lahir Ibu", lebar: 16, format: "dd/mm/yyyy", nilai: (p) => tgl(p.ibuTanggalLahir) },
    { header: "TTL Ibu", lebar: 24, nilai: (p) => str(p.ibuTtl) },
    { header: "Pendidikan Ibu", lebar: 16, nilai: (p) => str(p.ibuPendidikan) },
    { header: "Pekerjaan Ibu", lebar: 16, nilai: (p) => str(p.pekerjaanIbu) },
    { header: "Alamat Orang Tua", lebar: 30, nilai: (p) => str(p.alamatOrtu) },
    { header: "RT Ortu", lebar: 8, teks: true, nilai: (p) => str(p.ortuRt) },
    { header: "RW Ortu", lebar: 8, teks: true, nilai: (p) => str(p.ortuRw) },
    { header: "Desa Ortu", lebar: 18, nilai: (p) => str(p.ortuDesa) },
    { header: "Kecamatan Ortu", lebar: 16, nilai: (p) => str(p.ortuKecamatan) },
    { header: "Kabupaten Ortu", lebar: 16, nilai: (p) => str(p.ortuKabupaten) },
    { header: "Provinsi Ortu", lebar: 14, nilai: (p) => str(p.ortuPropinsi) },
    { header: "No. HP Orang Tua", lebar: 16, teks: true, nilai: (p) => bukaAman(p.noHpOrtu) ?? "" },
    { header: "Penghasilan Orang Tua", lebar: 28, nilai: (p) => (p.penghasilan ? label("penghasilan", p.penghasilan) : "") },
    { header: "Referensi Pendaftar", lebar: 20, nilai: (p) => str(p.referensiPendaftar) },
    { header: "SMP Kecamatan", lebar: 16, nilai: (p) => str(p.smpKecamatan) },
    { header: "SMP Kabupaten", lebar: 16, nilai: (p) => str(p.smpKabupaten) },
    { header: "SMP Provinsi", lebar: 14, nilai: (p) => str(p.smpPropinsi) },
    { header: "Nomor dan Tahun Ijazah", lebar: 24, nilai: (p) => str(p.ijazahNomorTahun) },
    { header: "Lama Belajar", lebar: 10, nilai: (p) => str(p.lamaBelajar) },
    { header: "Nilai Ujian B. Indonesia", lebar: 12, nilai: (p) => ujian(p, "b_indonesia") },
    { header: "Nilai Ujian B. Inggris", lebar: 12, nilai: (p) => ujian(p, "b_inggris") },
    { header: "Nilai Ujian Matematika", lebar: 12, nilai: (p) => ujian(p, "matematika") },
    { header: "Nilai Ujian IPA", lebar: 12, nilai: (p) => ujian(p, "ipa") },
    { header: "Golongan Darah", lebar: 10, nilai: (p) => str(p.golonganDarah) },
    { header: "Tinggi (cm)", lebar: 10, nilai: (p) => p.tinggiBadan },
    { header: "Berat (kg)", lebar: 10, nilai: (p) => p.beratBadan },
    { header: "Penyakit Pernah Diderita", lebar: 24, nilai: (p) => str(p.penyakitPernahDiderita) },
    { header: "Hobi Olahraga", lebar: 18, nilai: (p) => str(p.hobiOlahraga) },
    { header: "Hobi Kesenian", lebar: 18, nilai: (p) => str(p.hobiKesenian) },
    { header: "Organisasi", lebar: 18, nilai: (p) => str(p.hobiOrganisasi) },
    { header: "Prestasi", lebar: 24, nilai: (p) => str(p.hobiPrestasi) },
    { header: "Hobi Lain", lebar: 18, nilai: (p) => str(p.hobiLain) },
    { header: "Ukuran Seragam", lebar: 10, nilai: (p) => str(p.ukuranSeragam) },
    { header: "Sinkron Berkas", lebar: 12, nilai: (p) => p.berkasSinkron },
    ...kustom.map<Kolom>((f) => ({
      header: f.label,
      lebar: 20,
      nilai: (p) => {
        const v = ((p.dataKustom ?? {}) as Record<string, unknown>)[f.kunci];
        return v === undefined || v === null ? "" : typeof v === "boolean" ? (v ? "Ya" : "Tidak") : label(f.kunci, v);
      },
    })),
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator = "SPMB SMK Ma'arif NU 1 Wangon";
  wb.created = new Date();
  const ws = wb.addWorksheet("Data Pendaftar", { views: [{ state: "frozen", ySplit: 1, xSplit: 2 }] });
  ws.columns = kolom.map((k) => ({ header: k.header, width: k.lebar ?? 14, style: k.teks ? { numFmt: "@" } : k.format ? { numFmt: k.format } : {} }));

  const kepala = ws.getRow(1);
  kepala.height = 30;
  kepala.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri", size: 11 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HIJAU } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = { bottom: { style: "thin", color: { argb: LATAR_JUDUL } } };
  });

  let jumlah = 0;
  let kursor: bigint | undefined;
  for (;;) {
    const batch = await ambilBatch(where, 500, kursor);
    if (batch.length === 0) break;
    for (const p of batch) {
      const baris = ws.addRow(kolom.map((k) => k.nilai(p)));
      kolom.forEach((k, i) => {
        if (k.teks) baris.getCell(i + 1).numFmt = "@";
      });
      jumlah++;
    }
    kursor = batch[batch.length - 1].id;
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: kolom.length } };

  return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), jumlah };
}
