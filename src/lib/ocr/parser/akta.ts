import {
  ambilPasangan,
  bersihkanTeks,
  bungkus,
  kemiripanNama,
  kosong,
  parseTanggal,
  susunBaris,
  type Label,
} from "../normalisasi";
import type { BarisOcr, HasilParser, Keyakinan } from "../tipe";

// Parser Kutipan Akta Kelahiran (PRD v4 11.3): nama dan tempat/tanggal lahir hanya dari Akta, ditambah jenis
// kelamin dan nama orang tua. Nilai yang bisa berada di baris berikutnya dari labelnya tetap terbaca.

export type HasilAkta = {
  fields: HasilParser;
  /** Tanggal lahir terbaca (YYYY-MM-DD), dipakai membandingkan dengan Langkah 1; bukan field draf. */
  tanggalLahir: string | null;
  /** Nama anak terbaca, dipakai membandingkan dengan Langkah 1. */
  nama: string;
  peringatan: string[];
};

const LABEL: Label[] = [
  { kunci: "ttl", pola: /tempat\s*(\/|dan)?\s*tanggal\s*lahir|tempat\s*lahir/i },
  { kunci: "jk", pola: /jenis\s*kelamin/i },
  { kunci: "ayah", pola: /(nama\s*)?ayah(\s*kandung)?/i },
  { kunci: "ibu", pola: /(nama\s*)?ibu(\s*kandung)?/i },
  { kunci: "nama", pola: /\bnama(\s*(anak|lengkap))?\b(?!\s*(ayah|ibu|orang))/i },
];

const KATA_LABEL = /(tempat|tanggal|jenis\s*kelamin|nama|ayah|ibu|nomor|nik|alamat|kewarganegaraan)/i;

function namaWajar(s: string): string {
  return s.replace(/[^A-Za-z .'-]/g, " ").replace(/\s+/g, " ").trim();
}

function keyakinan(skor: number, sehat: boolean): Keyakinan {
  return sehat ? (skor >= 0.9 ? "HIGH" : "MEDIUM") : "LOW";
}

export function parseAkta(baris: BarisOcr[], namaTarget = ""): HasilAkta {
  const lines = susunBaris(baris.map((b) => ({ ...b, teks: bersihkanTeks(b.teks) })));
  const peta = new Map<string, { nilai: string; skor: number }>();

  lines.forEach((l, i) => {
    for (const p of ambilPasangan(l.teks, LABEL)) {
      if (peta.has(p.kunci)) continue;
      let nilai = p.nilai;
      // Nilai di baris berikutnya bila label berdiri sendiri.
      if (!nilai && lines[i + 1] && !KATA_LABEL.test(lines[i + 1].teks)) nilai = lines[i + 1].teks;
      if (nilai) peta.set(p.kunci, { nilai, skor: l.skor });
    }
  });

  const fields: HasilParser = {};
  const peringatan: string[] = [];

  const ttl = peta.get("ttl");
  const tanggal = ttl ? parseTanggal(ttl.nilai) : null;
  const tempat = ttl ? namaWajar(ttl.nilai.split(/[,\d]/)[0]) : "";
  fields.tempat_lahir = ttl && tempat.length >= 3 ? bungkus(tempat.toUpperCase(), keyakinan(ttl.skor, true)) : kosong();

  const jk = peta.get("jk");
  const kode = jk ? (/^\W*p/i.test(jk.nilai) ? "P" : /^\W*l/i.test(jk.nilai) ? "L" : "") : "";
  fields.jenis_kelamin = kode ? bungkus(kode, keyakinan(jk!.skor, true)) : kosong();

  for (const [kunci, tujuan] of [["ayah", "nama_ayah"], ["ibu", "nama_ibu"]] as const) {
    const v = peta.get(kunci);
    const nama = v ? namaWajar(v.nilai) : "";
    fields[tujuan] = nama.length >= 3 ? bungkus(nama.toUpperCase(), keyakinan(v!.skor, true)) : kosong();
  }

  const nama = peta.get("nama") ? namaWajar(peta.get("nama")!.nilai) : "";
  if (namaTarget && nama && kemiripanNama(namaTarget, nama) < 0.6) {
    peringatan.push(`Nama di Akta ("${nama}") berbeda dengan nama di Langkah 1. Periksa kembali.`);
  }
  if (!ttl) peringatan.push("Tempat dan tanggal lahir tidak ditemukan di Akta.");

  return { fields, tanggalLahir: tanggal, nama, peringatan };
}
