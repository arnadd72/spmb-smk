import { muatDefinisiField, simpanLangkah, unggahBerkas } from "@/server/services/draf";
import type { DefinisiField } from "@/server/validasi/wizard";

export const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);

/** Nilai valid untuk satu field, dibangkitkan dari definisinya. */
export function nilaiValid(f: DefinisiField): unknown {
  const khusus: Record<string, unknown> = {
    nama_lengkap: "Ahmad Fauzi",
    nisn: "1234567890",
    tanggal_lahir: "2011-05-17",
    nik: "3302010101010001",
    no_kk: "3302010101010002",
    nik_ayah: "3302010101010003",
    nik_ibu: "3302010101010004",
    ayah_tanggal_lahir: "1980-03-03",
    ibu_tanggal_lahir: "1983-07-12",
    jurusan_1: "AKL",
    jurusan_2: "TKR",
    // Isian angka dibatasi sejak commit aae4f0c dan 9ca8344.
    rt: "003",
    rw: "005",
    ortu_rt: "003",
    ortu_rw: "005",
    lama_belajar: "3",
  };
  if (f.kunci in khusus) return khusus[f.kunci];
  switch (f.tipe) {
    case "checkbox":
      return true;
    case "number":
      return 2;
    case "tel":
      return "081234567890";
    case "email":
      return "ahmad@contoh.id";
    case "date":
      return "2010-01-01";
    case "select":
    case "radio":
      return f.opsi?.[0]?.nilai ?? "AKL";
    default:
      return "Contoh";
  }
}

/** Jawaban tes minat bakat contoh untuk 15 soal bawaan migrasi: 10 jawaban B (AKL) dan 5 jawaban D (TKR), jadi saran utama AKL. */
export const JAWABAN_MINAT_CONTOH = Array.from({ length: 15 }, (_, i) => (i < 10 ? 1 : 3));

// NISN unik per pendaftar uji (poin E memblokir NISN ganda); yang pertama di tiap berkas tes tetap 1234567890.
let urutNisn = 0;

export async function isiLengkap(token: string, tanpaJurusan2 = false) {
  const fields = await muatDefinisiField();

  for (let n = 1; n <= 7; n++) {
    if (n === 2) {
      // Akta dan KK wajib sejak commit 9ca8344.
      await unggahBerkas(token, "akta", PNG, "scan.png");
      await unggahBerkas(token, "kk", PNG, "kk.png");
    }
    const isi: Record<string, unknown> = {};
    for (const f of fields.filter((x) => x.langkah === n && x.tipe !== "file" && x.tipe !== "tabel")) isi[f.kunci] = nilaiValid(f);
    if (n === 1) isi.nisn = String(1234567890 + urutNisn++);
    if (n === 3) isi.minat = JAWABAN_MINAT_CONTOH;
    if (n === 4 && tanpaJurusan2) delete isi.jurusan_2;
    await simpanLangkah(token, n, isi);
  }
}

