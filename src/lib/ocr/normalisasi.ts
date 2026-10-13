import type { BarisOcr, FieldOcr, Keyakinan } from "./tipe";

// Pembersih dan pencocok teks hasil OCR. Semua fungsi murni (tanpa DOM) supaya bisa diuji dengan Vitest.

/** Buang karakter di luar huruf Latin, angka, spasi, dan tanda baca umum (model multibahasa kadang menghasilkan huruf Tionghoa dari stempel). */
export function bersihkanTeks(s: string): string {
  return s
    .replace(/[^\p{Script=Latin}\p{N}\s.,:;/\-'()&|]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Huruf kecil, tanpa tanda baca, spasi tunggal. Dipakai untuk membandingkan nama dan label. */
export function normal(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let sebelum = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const baris = [i];
    for (let j = 1; j <= b.length; j++) {
      baris[j] = Math.min(sebelum[j] + 1, baris[j - 1] + 1, sebelum[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    sebelum = baris;
  }
  return sebelum[b.length];
}

/** Kemiripan 0 sampai 1 (1 - jarak Levenshtein / panjang terpanjang) setelah normalisasi. */
export function kemiripan(a: string, b: string): number {
  const x = normal(a);
  const y = normal(b);
  if (!x || !y) return 0;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

/** Kemiripan nama yang tahan kata menempel ("SITINURHALIZA") dan urutan kata berbeda. */
export function kemiripanNama(a: string, b: string): number {
  const rapat = kemiripan(a.replace(/\s+/g, ""), b.replace(/\s+/g, ""));
  const urut = (s: string) => normal(s).split(" ").sort().join(" ");
  return Math.max(rapat, kemiripan(urut(a), urut(b)));
}

export function keyakinanDariSkor(skor: number): Keyakinan {
  return skor >= 0.85 ? "HIGH" : skor >= 0.7 ? "MEDIUM" : "LOW";
}

export const kosong = (): FieldOcr => ({ nilai: "", keyakinan: "NOT_FOUND" });

/** Isi field hanya bila keyakinan HIGH atau MEDIUM (PRD 11: tidak menebak). */
export function bungkus(nilai: string, keyakinan: Keyakinan): FieldOcr {
  if (!nilai) return kosong();
  if (keyakinan === "LOW" || keyakinan === "NOT_FOUND") return { nilai: "", keyakinan: "LOW" };
  return { nilai, keyakinan };
}

// ------------------------------------------------------------------ angka dan tanggal

const MIRIP_ANGKA: Record<string, string> = { O: "0", o: "0", Q: "0", D: "0", I: "1", l: "1", "|": "1", i: "1", S: "5", s: "5", B: "8", Z: "2", z: "2", G: "6" };

/** Perbaiki karakter yang sering tertukar dengan angka. `diperbaiki` true bila ada karakter yang diganti. */
export function koreksiAngka(token: string): { nilai: string; diperbaiki: boolean } {
  let diperbaiki = false;
  const nilai = [...token]
    .map((c) => {
      if (/\d/.test(c)) return c;
      const g = MIRIP_ANGKA[c];
      if (g) {
        diperbaiki = true;
        return g;
      }
      return c;
    })
    .join("");
  return { nilai, diperbaiki };
}

/** Semua deret 16 digit dalam teks, termasuk yang tertukar huruf. Deret 15 atau 17 digit diabaikan (tidak menebak). */
export function cariDeret16(teks: string): { nilai: string; diperbaiki: boolean }[] {
  const hasil: { nilai: string; diperbaiki: boolean }[] = [];
  for (const token of teks.split(/[^0-9A-Za-z|]+/)) {
    if (token.length !== 16) continue;
    const angka = (token.match(/\d/g) ?? []).length;
    if (angka < 11) continue;
    const k = koreksiAngka(token);
    if (/^\d{16}$/.test(k.nilai)) hasil.push(k);
  }
  return hasil;
}

const BULAN: Record<string, number> = {
  januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, agu: 8, agt: 8, sep: 9, okt: 10, nov: 11, des: 12,
};

const dua = (n: number) => String(n).padStart(2, "0");

function validasiTanggal(h: number, b: number, t: number): string | null {
  if (t < 1900 || t > new Date().getFullYear() || b < 1 || b > 12 || h < 1 || h > 31) return null;
  const d = new Date(Date.UTC(t, b - 1, h));
  if (d.getUTCMonth() !== b - 1) return null;
  return `${t}-${dua(b)}-${dua(h)}`;
}

/** Ubah "12-05-2010", "12/05/2010", "12 Mei 2010", atau "22-04.197B" (angka tertukar huruf) menjadi YYYY-MM-DD. Null bila tidak valid. */
export function parseTanggal(teks: string): string | null {
  const t = teks.replace(/\s+/g, " ");
  const huruf = t.match(/(\d{1,2})\s*([A-Za-z]{3,9})\s*(\S{4})/);
  if (huruf) {
    const bulan = BULAN[huruf[2].toLowerCase()];
    const tahun = Number(koreksiAngka(huruf[3]).nilai);
    if (bulan && Number.isInteger(tahun)) {
      const r = validasiTanggal(Number(huruf[1]), bulan, tahun);
      if (r) return r;
    }
  }
  const angka = t.match(/(\S{1,2})\s*[-/.]\s*(\S{1,2})\s*[-/.]\s*(\S{4})/);
  if (angka) {
    const h = Number(koreksiAngka(angka[1]).nilai);
    const b = Number(koreksiAngka(angka[2]).nilai);
    const th = Number(koreksiAngka(angka[3]).nilai);
    if ([h, b, th].every(Number.isInteger)) return validasiTanggal(h, b, th);
  }
  return null;
}

// ------------------------------------------------------------------ baris dan label

export type BarisGabung = { teks: string; item: BarisOcr[]; y: number; skor: number };

const pusatY = (i: BarisOcr) => (i.kotak[1] + i.kotak[3]) / 2;
export const pusatX = (i: BarisOcr) => (i.kotak[0] + i.kotak[2]) / 2;

/** Kelompokkan potongan teks yang sejajar secara vertikal menjadi baris, urut atas ke bawah dan kiri ke kanan. */
export function susunBaris(items: BarisOcr[]): BarisGabung[] {
  const urut = items.filter((i) => i.teks.trim() !== "").sort((a, b) => pusatY(a) - pusatY(b));
  const kelompok: BarisOcr[][] = [];
  for (const it of urut) {
    const akhir = kelompok[kelompok.length - 1];
    if (akhir) {
      const ref = akhir[0];
      const tinggi = Math.min(it.kotak[3] - it.kotak[1], ref.kotak[3] - ref.kotak[1]);
      if (Math.abs(pusatY(it) - pusatY(ref)) <= Math.max(6, 0.55 * tinggi)) {
        akhir.push(it);
        continue;
      }
    }
    kelompok.push([it]);
  }
  return kelompok.map((k) => {
    const item = [...k].sort((a, b) => a.kotak[0] - b.kotak[0]);
    return {
      teks: item.map((i) => i.teks.trim()).join(" "),
      item,
      y: pusatY(item[0]),
      skor: item.reduce((a, i) => a + i.skor, 0) / item.length,
    };
  });
}

export type Label = { kunci: string; pola: RegExp };

/**
 * Ambil pasangan label:nilai dari satu baris. Satu baris bisa memuat dua pasangan (tata letak dua kolom KK),
 * jadi nilai dibaca sampai label berikutnya pada baris yang sama.
 */
export function ambilPasangan(teks: string, labels: Label[]): { kunci: string; nilai: string }[] {
  const temu: { kunci: string; awal: number; akhir: number }[] = [];
  for (const l of labels) {
    const re = new RegExp(l.pola.source, l.pola.flags.includes("g") ? l.pola.flags : l.pola.flags + "g");
    for (const m of teks.matchAll(re)) temu.push({ kunci: l.kunci, awal: m.index ?? 0, akhir: (m.index ?? 0) + m[0].length });
  }
  temu.sort((a, b) => a.awal - b.awal || b.akhir - a.akhir);
  // buang temuan yang tumpang tindih: yang awalnya lebih dulu menang
  const bersih: typeof temu = [];
  for (const t of temu) {
    const terakhir = bersih[bersih.length - 1];
    if (terakhir && t.awal < terakhir.akhir) continue;
    bersih.push(t);
  }
  return bersih.map((t, i) => ({
    kunci: t.kunci,
    nilai: teks
      .slice(t.akhir, bersih[i + 1]?.awal ?? teks.length)
      .replace(/^[\s:;.\-]+/, "")
      .replace(/[\s:;]+$/, "")
      .trim(),
  }));
}
