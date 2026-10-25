// Bilangan dan tanggal yang ditulis dengan huruf (Akta Kelahiran: "dua puluh enam Agustus tahun dua ribu dua").
// Tahan salah baca OCR yang umum: kata menempel ("Duapuluh"), terpecah ("Sembilanra tus"), dan salah eja ringan
// ("saty", "Agustue"). Murni (tanpa DOM) supaya bisa diuji.

const SATUAN: Record<string, number> = { satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9 };
const KHUSUS: Record<string, number> = { sepuluh: 10, sebelas: 11, seratus: 100, seribu: 1000 };
const PENGALI = ["belas", "puluh", "ratus", "ribu"];
const KOSAKATA = [...Object.keys(SATUAN), ...Object.keys(KHUSUS), ...PENGALI];

const BULAN: [string, number][] = [
  ["januari", 1], ["februari", 2], ["pebruari", 2], ["maret", 3], ["april", 4], ["mei", 5], ["juni", 6], ["juli", 7],
  ["agustus", 8], ["september", 9], ["oktober", 10], ["november", 11], ["nopember", 11], ["desember", 12],
];

function jarak(a: string, b: string): number {
  if (a === b) return 0;
  let sebelum = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const baris = [i];
    for (let j = 1; j <= b.length; j++) baris[j] = Math.min(sebelum[j] + 1, baris[j - 1] + 1, sebelum[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    sebelum = baris;
  }
  return sebelum[b.length];
}

/** Batas salah eja yang masih diterima: kata pendek harus persis, kata panjang boleh dua huruf beda. */
const batasEja = (panjang: number) => (panjang <= 3 ? 0 : panjang <= 5 ? 1 : 2);

/** Kata bilangan terdekat, atau null. */
function kataBilangan(t: string): string | null {
  if (KOSAKATA.includes(t)) return t;
  let terbaik: string | null = null;
  let jarakTerbaik = Infinity;
  for (const k of KOSAKATA) {
    const d = jarak(t, k);
    // Huruf awal harus sama, kecuali kata panjang dengan satu huruf beda (r terbaca n: "nibu").
    if (k[0] !== t[0] && !(d === 1 && k.length >= 4)) continue;
    if (d <= batasEja(k.length) && d < jarakTerbaik) {
      terbaik = k;
      jarakTerbaik = d;
    }
  }
  return terbaik;
}

/** Pecah kata menempel menjadi kata bilangan ("duapuluh" -> dua puluh); null bila tidak bisa. */
function pecahMenempel(t: string): string[] | null {
  const hasil: (string[] | null)[] = Array(t.length + 1).fill(null);
  hasil[0] = [];
  for (let i = 0; i < t.length; i++) {
    if (!hasil[i]) continue;
    for (const k of KOSAKATA) {
      if (t.startsWith(k, i) && !hasil[i + k.length]) hasil[i + k.length] = [...hasil[i]!, k];
    }
  }
  return hasil[t.length] && hasil[t.length]!.length > 1 ? hasil[t.length] : null;
}

const kecil = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, " ").trim();

/**
 * Ubah token teks menjadi kata bilangan baku; token yang bukan bilangan menjadi null (pemisah).
 * Token yang terpecah OCR dicoba digabung dengan token berikutnya.
 */
function kanonik(token: string[]): (string | null)[] {
  const tepat = (t: string) => (KOSAKATA.includes(t) ? [t] : pecahMenempel(t));
  const hasil: (string | null)[] = [];
  for (let i = 0; i < token.length; i++) {
    const t = token[i];
    const berikut = token[i + 1];
    // Urutan: kata persis, kata menempel, gabungan dengan token berikutnya (kata terpecah OCR), baru salah eja.
    const persis = tepat(t);
    if (persis) {
      hasil.push(...persis);
      continue;
    }
    const gabung = berikut !== undefined ? tepat(t + berikut) : null;
    if (gabung) {
      hasil.push(...gabung);
      i++;
      continue;
    }
    const mirip = kataBilangan(t);
    if (mirip) {
      hasil.push(mirip);
      continue;
    }
    const gabungMirip = berikut !== undefined ? kataBilangan(t + berikut) : null;
    if (gabungMirip) {
      hasil.push(gabungMirip);
      i++;
      continue;
    }
    hasil.push(null);
  }
  return hasil;
}

/** Hitung nilai deret kata bilangan baku. Null bila deret tidak membentuk bilangan yang sah. */
function nilaiDeret(kata: string[]): number | null {
  let i = 0;
  const lihat = (n = 0) => kata[i + n];
  const bawahSeribu = (): number | null => {
    const mulai = i;
    let v = 0;
    if (lihat() === "seratus") {
      v = 100;
      i++;
    } else if (lihat() in SATUAN && lihat(1) === "ratus") {
      v = SATUAN[lihat()] * 100;
      i += 2;
    }
    if (lihat() === "sepuluh" || lihat() === "sebelas") {
      v += KHUSUS[lihat()];
      i++;
    } else if (lihat() in SATUAN && lihat(1) === "belas") {
      v += SATUAN[lihat()] + 10;
      i += 2;
    } else if (lihat() in SATUAN && lihat(1) === "puluh") {
      v += SATUAN[lihat()] * 10;
      i += 2;
      if (lihat() in SATUAN && lihat(1) !== "ratus" && lihat(1) !== "belas" && lihat(1) !== "puluh") v += SATUAN[kata[i++]];
    } else if (lihat() in SATUAN) {
      v += SATUAN[kata[i++]];
    }
    return i > mulai ? v : null;
  };

  let total = 0;
  if (lihat() === "seribu") {
    total = 1000;
    i++;
  } else {
    const simpan = i;
    const v = bawahSeribu();
    if (v !== null && lihat() === "ribu") {
      total = v * 1000;
      i++;
    } else {
      i = simpan;
    }
  }
  const sisa = bawahSeribu();
  if (sisa !== null) total += sisa;
  if (i === 0 || i !== kata.length) return null;
  return total;
}

/** Bilangan dari teks huruf ("dua ribu tujuh" -> 2007). Null bila teks bukan bilangan. */
export function angkaDariKata(teks: string): number | null {
  const k = kanonik(kecil(teks).split(" ").filter(Boolean));
  if (k.length === 0 || k.some((x) => x === null)) return null;
  return nilaiDeret(k as string[]);
}

/** Nomor bulan (1-12) dari nama bulan, termasuk ejaan lama dan salah baca OCR ringan. Null bila bukan bulan. */
export function cocokBulan(token: string): number | null {
  const t = token.toLowerCase().replace(/1/g, "l").replace(/0/g, "o").replace(/[^a-z]/g, "");
  if (t.length < 3) return null;
  for (const [nama, n] of BULAN) {
    if (t === nama) return n;
    // Bulan empat huruf atau kurang (mei, juni, juli) harus persis: juni dan juli hanya beda satu huruf.
    if (nama.length >= 5 && t[0] === nama[0] && jarak(t, nama) <= (nama.length >= 7 ? 2 : 1)) return n;
  }
  return null;
}

const dua = (n: number) => String(n).padStart(2, "0");

function tanggalSah(h: number, b: number, t: number): string | null {
  if (t < 1900 || t > new Date().getFullYear() || h < 1 || h > 31) return null;
  const d = new Date(Date.UTC(t, b - 1, h));
  return d.getUTCMonth() === b - 1 ? `${t}-${dua(b)}-${dua(h)}` : null;
}

/** Kata pengisi di sekitar tanggal Akta yang dilewati (tidak memutus deret bilangan). */
const PENGISI = /^(tanggal|tangal|tanggl|bulan|tahun|tabun|tahum|jahun|hari|han|jam|wib|pada|on|date|of|the|senin|selasa|rabu|kamis|jumat|sabtu|minggu|ahad|wage|pon|legi|pahing|kliwon)$/;

/**
 * Tanggal YYYY-MM-DD dari teks Akta: hari (huruf atau angka), nama bulan, lalu tahun (huruf atau angka).
 * Null bila salah satu bagian tidak ada atau tanggalnya tidak sah (tidak menebak).
 */
export function tanggalDariKata(teks: string): string | null {
  const mentah = teks.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const iBulan = mentah.findIndex((t) => /[a-z]/i.test(t) && cocokBulan(t) !== null);
  if (iBulan < 0) return null;
  const bulan = cocokBulan(mentah[iBulan])!;

  // Hari: kata bilangan (atau angka) tepat sebelum bulan, melewati kata pengisi.
  let j = iBulan - 1;
  while (j >= 0 && PENGISI.test(mentah[j].toLowerCase())) j--;
  let hari: number | null = null;
  if (j >= 0 && /^\d{1,2}$/.test(mentah[j])) hari = Number(mentah[j]);
  else {
    const kata: string[] = [];
    for (let k = j; k >= 0 && k > j - 4; k--) {
      const c = kanonik([mentah[k].toLowerCase()]);
      if (c.some((x) => x === null) || !/[a-z]/i.test(mentah[k])) break;
      kata.unshift(mentah[k]);
    }
    // Ambil sufiks terpanjang yang membentuk bilangan (kata sebelumnya bisa sisa label).
    for (let s = 0; s < kata.length && hari === null; s++) hari = angkaDariKata(kata.slice(s).join(" "));
  }
  if (hari === null) return null;

  // Tahun: angka 4 digit, atau deret kata bilangan pertama setelah bulan (melewati kata pengisi dan hari dalam pekan).
  const sesudah = mentah.slice(iBulan + 1);
  const angka = sesudah.find((t) => /^\d{4}$/.test(t));
  let tahun: number | null = angka && sesudah.indexOf(angka) <= 6 ? Number(angka) : null;
  if (tahun === null) {
    for (let k = 0; k < sesudah.length && k < 10 && tahun === null; k++) {
      if (!/[a-z]/i.test(sesudah[k]) || PENGISI.test(sesudah[k].toLowerCase())) continue;
      if (kanonik([sesudah[k].toLowerCase()])[0] === null && kanonik(sesudah.slice(k, k + 2).map((x) => x.toLowerCase()))[0] === null) continue;
      let akhir = k;
      while (akhir < sesudah.length && /[a-z]/i.test(sesudah[akhir]) && !PENGISI.test(sesudah[akhir].toLowerCase())) akhir++;
      const potongan = sesudah.slice(k, akhir);
      for (let n = potongan.length; n > 0 && tahun === null; n--) {
        const v = angkaDariKata(potongan.slice(0, n).join(" "));
        if (v !== null && v >= 1900 && v <= new Date().getFullYear()) tahun = v;
      }
    }
  }
  if (tahun === null) return null;
  return tanggalSah(hari, bulan, tahun);
}
