import { muatDefinisiField, simpanLangkah, unggahBerkas } from "@/server/services/draf";
import { muatBobotJurusan } from "@/server/services/rekomendasi";
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

export async function isiLengkap(token: string, tanpaJurusan2 = false) {
  const fields = await muatDefinisiField();
  const bobot = await muatBobotJurusan();
  const mapel = [...new Set(bobot.flatMap((j) => j.bobot.map((m) => m.kode)))];

  for (let n = 1; n <= 7; n++) {
    if (n === 2) await unggahBerkas(token, "akta", PNG, "scan.png");
    const isi: Record<string, unknown> = {};
    for (const f of fields.filter((x) => x.langkah === n && x.tipe !== "file" && x.tipe !== "tabel")) isi[f.kunci] = nilaiValid(f);
    if (n === 3) isi.nilai_rapor = { mapel: Object.fromEntries(mapel.map((k) => [k, { "1": 80, "2": 82 }])) };
    if (n === 4 && tanpaJurusan2) delete isi.jurusan_2;
    if (n === 7) isi.nilai_ujian = { b_indonesia: 80, b_inggris: 75, matematika: 90, ipa: 70 };
    await simpanLangkah(token, n, isi);
  }
}

