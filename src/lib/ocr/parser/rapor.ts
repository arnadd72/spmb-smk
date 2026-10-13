import { bersihkanTeks, kemiripan, koreksiAngka, normal, pusatX, susunBaris, type BarisGabung } from "../normalisasi";
import type { BarisOcr, Keyakinan, MapelRef } from "../tipe";

// Parser rapor (PRD v4 11.4): tabel mata pelajaran disusun dari koordinat. Satu berkas = satu halaman rapor;
// semester dideteksi dari header, bila gagal pendaftar memilih sendiri. Hasil selalu ditampilkan sebagai tabel yang bisa diedit.

export type SelNilai = { nilai: number; keyakinan: Keyakinan };
export type HasilRapor = {
  semester: number | null;
  nilai: Record<string, SelNilai>;
  tidakDikenali: { nama: string; nilai: number }[];
};

const ABAIKAN = /\b(dan budi pekerti|budi pekerti)\b/g;
const bersihNama = (s: string) => normal(s).replace(ABAIKAN, "").replace(/\s+/g, " ").trim();

/** Semester 1 sampai 6 dari teks header ("Semester 2", "Kelas VIII Ganjil"). Null bila tidak dapat dipastikan. */
export function deteksiSemester(teks: string): number | null {
  const t = teks.toLowerCase();
  const kelasM = t.match(/kelas\s*:?\s*(viii|vii|ix|7|8|9)\b/);
  const kelas = kelasM ? { vii: 1, "7": 1, viii: 2, "8": 2, ix: 3, "9": 3 }[kelasM[1]] ?? null : null;
  const angka = t.match(/semester\s*:?\s*([1-6])\b/);
  const paritas = /\bganjil\b/.test(t) ? 1 : /\bgenap\b/.test(t) ? 2 : null;
  if (angka) {
    const n = Number(angka[1]);
    if (n > 2) return n;
    if (kelas) return (kelas - 1) * 2 + n;
    return paritas === null && !kelas ? null : n;
  }
  if (kelas && paritas) return (kelas - 1) * 2 + paritas;
  return null;
}

function angkaNilai(teks: string): number | null {
  const t = teks.trim();
  if (!/^[\dOoIl|SB]{1,3}([.,]\d{1,2})?$/.test(t) || !/\d/.test(t)) return null;
  const n = Number(koreksiAngka(t).nilai.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

function cocokkan(nama: string, mapel: MapelRef[]): { kode: string; skor: number } | null {
  const n = bersihNama(nama);
  if (n.length < 3) return null;
  let terbaik: { kode: string; skor: number } | null = null;
  for (const m of mapel) {
    for (const calon of [m.nama, ...m.alias]) {
      const c = bersihNama(calon);
      if (!c) continue;
      let skor = kemiripan(n, c);
      const kataN = n.split(" ");
      if (c.length >= 3 && c.split(" ").every((k) => kataN.includes(k))) skor = Math.max(skor, 0.88);
      if (!terbaik || skor > terbaik.skor) terbaik = { kode: m.kode, skor };
    }
  }
  return terbaik;
}

const hurufSaja = (s: string) => (s.match(/\p{L}/gu) ?? []).length;

function barisTabel(l: BarisGabung, xPengetahuan: number | null): { nama: string; nilai: number } | null {
  const item = l.item.map((i) => ({ i, nilai: angkaNilai(i.teks) }));
  // Kandidat nilai: angka yang punya teks nama di sebelah kirinya (nomor urut tidak punya).
  const kandidat = item.filter((x, idx) => x.nilai !== null && item.slice(0, idx).some((y) => y.nilai === null && hurufSaja(y.i.teks) >= 2));
  if (kandidat.length === 0) return null;
  const pilih =
    xPengetahuan === null
      ? kandidat[0]
      : kandidat.reduce((a, b) => (Math.abs(pusatX(b.i) - xPengetahuan) < Math.abs(pusatX(a.i) - xPengetahuan) ? b : a));
  const sebelum = item.slice(0, item.indexOf(pilih)).filter((x) => x.nilai === null);
  const nama = sebelum.map((x) => x.i.teks).join(" ").replace(/^\s*\d{1,2}[\s.)]+/, "").trim();
  return nama ? { nama, nilai: pilih.nilai as number } : null;
}

export function parseRapor(baris: BarisOcr[], mapel: MapelRef[]): HasilRapor {
  const lines = susunBaris(baris.map((b) => ({ ...b, teks: bersihkanTeks(b.teks) })));
  const semua = lines.map((l) => l.teks).join(" ");
  const semester = deteksiSemester(semua);

  // Kolom "Pengetahuan" (rapor K13) bila ada: nilai dipilih dari kolom tersebut, bukan Keterampilan.
  const headerPeng = lines.flatMap((l) => l.item).find((i) => /pengetahuan/i.test(i.teks));
  const xPeng = headerPeng ? pusatX(headerPeng) : null;

  const nilai: HasilRapor["nilai"] = {};
  const tidakDikenali: HasilRapor["tidakDikenali"] = [];
  const skorTerbaik: Record<string, number> = {};
  let tertunda = "";

  for (const l of lines) {
    const t = barisTabel(l, xPeng);
    if (!t) {
      // baris tanpa nilai bisa jadi awal nama mapel yang terpotong ke dua baris
      tertunda = hurufSaja(l.teks) >= 3 && l.item.every((i) => angkaNilai(i.teks) === null) && l.teks.length < 60 ? l.teks : "";
      continue;
    }
    let nama = t.nama;
    if (hurufSaja(nama) < 3 && tertunda) nama = tertunda;
    tertunda = "";
    const cocok = cocokkan(nama, mapel);
    if (cocok && cocok.skor >= 0.7) {
      if ((skorTerbaik[cocok.kode] ?? 0) < cocok.skor) {
        skorTerbaik[cocok.kode] = cocok.skor;
        nilai[cocok.kode] = { nilai: t.nilai, keyakinan: cocok.skor >= 0.85 ? "HIGH" : "MEDIUM" };
      }
    } else if (hurufSaja(nama) >= 4) {
      tidakDikenali.push({ nama, nilai: t.nilai });
    }
  }

  return { semester, nilai, tidakDikenali };
}
