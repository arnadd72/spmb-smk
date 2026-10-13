import {
  ambilPasangan,
  bersihkanTeks,
  bungkus,
  cariDeret16,
  kemiripanNama,
  kosong,
  parseTanggal,
  susunBaris,
  type BarisGabung,
  type Label,
} from "../normalisasi";
import type { BarisOcr, HasilParser, Keyakinan } from "../tipe";

// Parser Kartu Keluarga (PRD v4 11.3, aturan v3.1 11.3): nomor KK dari header, NIK siswa dari anggota yang namanya
// paling mirip nama di Langkah 1, alamat dari pasangan label dan nilai. Tidak menebak: ragu berarti kosong.

export type AnggotaKk = { nama: string; nik: string; tanggalLahir: string | null; jk: "L" | "P" | "" };
export type HasilKk = { fields: HasilParser; anggota: AnggotaKk[]; peringatan: string[] };

const LABEL: Label[] = [
  { kunci: "kepala", pola: /nama\s*kepala\s*keluarga/i },
  { kunci: "rtrw", pola: /\brt\s*\/\s*rw/i },
  { kunci: "kodepos", pola: /kode\s*pos/i },
  { kunci: "alamat", pola: /alamat/i },
  { kunci: "desa", pola: /(desa|kelurahan)(\s*\/\s*(desa|kelurahan))?/i },
  { kunci: "kecamatan", pola: /kec\w{2,8}n\b/i },
  { kunci: "kabupaten", pola: /kabupaten\s*(\/\s*)?(kota|mota|kcta)?/i },
  { kunci: "propinsi", pola: /provin?si/i },
];

const NAMA_BERSIH = /[^A-Za-z .'-]/g;

function barisAnggota(b: BarisGabung): AnggotaKk | null {
  // Buang nomor urut di awal baris, lalu cari NIK (16 digit) atau tanda baris anggota (tanggal lahir + jenis kelamin).
  const teks = b.teks.replace(/^\s*\d{1,2}[\s.)]+(?=\D)/, "");
  const deret = cariDeret16(teks);
  const adaTanggal = parseTanggal(teks) !== null;
  const adaJk = /(laki|lak\w*laki|perempuan|peremp\w+)/i.test(teks);
  const adaDigitPanjang = /\d{12,}/.test(teks.replace(/\s+/g, ""));
  if (deret.length === 0 && !(adaTanggal && (adaJk || adaDigitPanjang))) return null;

  const indeksAngka = teks.search(/[\dOoIl|SBZ]{10,}/);
  const awalNama = teks.slice(0, indeksAngka > 0 ? indeksAngka : teks.search(/\d/) > 0 ? teks.search(/\d/) : teks.length);
  const nama = awalNama.replace(NAMA_BERSIH, " ").replace(/\s+/g, " ").trim();
  if ((nama.match(/[A-Za-z]/g) ?? []).length < 3) return null;

  const jk = /perempuan|peremp/i.test(teks) ? "P" : /laki|lak\w*laki/i.test(teks) ? "L" : "";
  return { nama, nik: deret[0]?.nilai ?? "", tanggalLahir: parseTanggal(teks), jk };
}

function tahunDari(tgl: string | null): number | null {
  return tgl ? Number(tgl.slice(0, 4)) : null;
}

function keyakinanBaris(skor: number, sehat: boolean): Keyakinan {
  return sehat && skor >= 0.9 ? "HIGH" : sehat ? "MEDIUM" : "LOW";
}

export function parseKk(baris: BarisOcr[], namaTarget: string): HasilKk {
  const bersih = baris.map((b) => ({ ...b, teks: bersihkanTeks(b.teks) }));
  const lines = susunBaris(bersih);
  const fields: HasilParser = {};
  const peringatan: string[] = [];

  // Anggota keluarga
  const anggota: AnggotaKk[] = [];
  const barisAnggotaIdx = new Set<number>();
  lines.forEach((l, i) => {
    const a = barisAnggota(l);
    if (a) {
      anggota.push(a);
      barisAnggotaIdx.add(i);
    }
  });

  // Nomor KK: deret 16 digit pertama di luar baris anggota
  const header = lines.filter((_, i) => !barisAnggotaIdx.has(i)).slice(0, 10);
  const noKk = header.flatMap((l) => cariDeret16(l.teks))[0];
  fields.no_kk = noKk ? bungkus(noKk.nilai, noKk.diperbaiki ? "MEDIUM" : "HIGH") : kosong();

  // NIK siswa dari anggota paling mirip nama
  fields.nik = kosong();
  if (namaTarget.trim().length >= 3 && anggota.length > 0) {
    const urut = anggota.map((a) => ({ a, s: kemiripanNama(namaTarget, a.nama) })).sort((x, y) => y.s - x.s);
    const terbaik = urut[0];
    if (terbaik.s < 0.7) {
      peringatan.push("Nama calon siswa tidak ditemukan di Kartu Keluarga. Periksa nama di Langkah 1 atau isi NIK secara manual.");
    } else if (!terbaik.a.nik) {
      peringatan.push("NIK calon siswa tidak terbaca jelas. Isi NIK secara manual.");
      fields.nik = { nilai: "", keyakinan: "LOW" };
    } else {
      fields.nik = bungkus(terbaik.a.nik, terbaik.s >= 0.85 ? "HIGH" : "MEDIUM");
    }
  } else if (anggota.length === 0) {
    peringatan.push("Daftar anggota keluarga tidak terbaca.");
  }

  // Alamat dan wilayah: pasangan label dan nilai
  const diisi = new Set<string>();
  lines.forEach((l, i) => {
    if (barisAnggotaIdx.has(i)) return;
    for (const p of ambilPasangan(l.teks, LABEL)) {
      if (diisi.has(p.kunci) || !p.nilai) continue;
      diisi.add(p.kunci);
      if (p.kunci === "rtrw") {
        const m = p.nilai.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
        if (m) {
          fields.rt = bungkus(m[1], keyakinanBaris(l.skor, true));
          fields.rw = bungkus(m[2], keyakinanBaris(l.skor, true));
        }
      } else if (["alamat", "desa", "kecamatan", "kabupaten", "propinsi"].includes(p.kunci)) {
        const nilai = p.nilai.replace(/[^A-Za-z0-9 .,'/-]/g, "").trim();
        fields[p.kunci] = bungkus(nilai, keyakinanBaris(l.skor, nilai.length >= 3));
      }
    }
  });
  for (const k of ["alamat", "rt", "rw", "desa", "kecamatan", "kabupaten", "propinsi"]) fields[k] ??= kosong();

  // Nama ayah dan ibu dari KK hanya sebagai cadangan (Akta lebih dipercaya): kepala keluarga laki-laki dan istri.
  const target = namaTarget ? anggota.map((a) => ({ a, s: kemiripanNama(namaTarget, a.nama) })).sort((x, y) => y.s - x.s)[0] : undefined;
  const tahunAnak = tahunDari(target && target.s >= 0.7 ? target.a.tanggalLahir : null);
  fields.nama_ayah = kosong();
  fields.nama_ibu = kosong();
  if (tahunAnak) {
    const ayah = anggota.find((a) => a.jk === "L" && (tahunDari(a.tanggalLahir) ?? 9999) <= tahunAnak - 15);
    const ibu = anggota.find((a) => a.jk === "P" && (tahunDari(a.tanggalLahir) ?? 9999) <= tahunAnak - 15);
    if (ayah) fields.nama_ayah = bungkus(ayah.nama.toUpperCase(), "MEDIUM");
    if (ibu) fields.nama_ibu = bungkus(ibu.nama.toUpperCase(), "MEDIUM");
  }

  return { fields, anggota, peringatan };
}
