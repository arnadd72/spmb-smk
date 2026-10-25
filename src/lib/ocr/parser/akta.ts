import { tanggalDariKata } from "../kata";
import { bersihkanTeks, bungkus, kemiripanNama, kosong, parseTanggal, susunBaris, type BarisGabung } from "../normalisasi";
import type { BarisOcr, HasilParser, Keyakinan } from "../tipe";

// Parser Kutipan Akta Kelahiran (PRD v4 11.3). Akta Indonesia ditulis sebagai kalimat, bukan pasangan label:
//   "... bahwa di <TEMPAT> pada tanggal <tanggal dalam huruf> tahun <tahun> telah lahir <NAMA>
//    anak ke <n>, <jenis kelamin> dari ayah <AYAH> dan ibu <IBU>"   (format baru, dwibahasa)
//   "... dari suami-istri <AYAH> dan <IBU>"                         (format lama)
// Parser mencari jangkar kalimat itu dengan toleransi salah baca OCR. Nilai yang meragukan dikosongkan, tidak ditebak.

export type HasilAkta = {
  fields: HasilParser;
  /** Tanggal lahir terbaca (YYYY-MM-DD), dipakai membandingkan dengan Langkah 1; bukan field draf. */
  tanggalLahir: string | null;
  /** Nama anak terbaca, dipakai membandingkan dengan Langkah 1. */
  nama: string;
  peringatan: string[];
};

// "di" boleh menempel pada nama tempat ("bahwa diRIMBO BUJANG").
const J_BAHWA = /\b[bB]\w{1,2}[wW][aA]\W{0,3}[dD][iI](?=[A-Z]|\W|$)/;
const J_TANGGAL = /\b(?:p\w{0,2}\s*\w?\s*da\s+)?ta\w{0,2}g+\w{0,2}l\b|\blanggal\b/i;
// "telah" cukup sebagai jangkar: "lahir" sering salah baca ("bahir", "ilahit").
const J_LAHIR = /\b(?:telah|tela|telan)\b|\blahir\b/i;
const J_DARI = /\bdari\b/i;
const J_ORTU = /(ayah|suami|isteri|istri|1steri|lsteri)/i;
const NAMA_HARI = new Set(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu", "ahad", "wage", "pon", "legi", "pahing", "kliwon"]);
const J_AKHIR_KLAUSA = /(kutipan|excerpt|perkawinan|dikeluarkan|sesuai dengan|kepala\b|head of)/i;
/** Baris terjemahan bahasa Inggris pada akta dwibahasa: dibuang dari bagian berbahasa Indonesia. */
const INGGRIS = /\b(that in|on date|on year|was born|thousand|twenty|thirty|child\s*no|chld|from father|and mother|daughter|registry|excerpt|by virtue)\b/i;
/** Kata keterangan yang tidak pernah menjadi bagian nama orang. */
const BUKAN_NAMA = new Set(["DAN", "DARI", "AYAH", "IBU", "ANAK", "KE", "SAH", "SUAMI", "ISTRI", "ISTERI", "CHILD", "NO", "FROM", "FATHER", "MOTHER", "AND", "THE", "OF", "TELAH", "LAHIR", "TAHUN", "TANGGAL", "PADA", "LAKI", "PEREMPUAN", "JENIS", "KELAMIN"]);

function keyakinan(skor: number): Keyakinan {
  return skor >= 0.9 ? "HIGH" : skor >= 0.75 ? "MEDIUM" : "LOW";
}

/** Huruf terbaca terpisah-pisah ("A e e h Ti m u r") tidak bisa disusun ulang dengan pasti. */
const hurufBerspasi = (s: string) => {
  const t = s.split(/\s+/).filter(Boolean);
  return t.length >= 3 && t.filter((x) => x.replace(/[^A-Za-z]/g, "").length <= 2).length / t.length >= 0.5;
};

/** Bersihkan calon nama orang: hanya huruf, spasi, titik, dan petik; tolak tanggal, angka, dan kata keterangan. */
function namaOrang(mentah: string): string {
  if (/\d/.test(mentah) || hurufBerspasi(mentah)) return "";
  const token = mentah
    .replace(/[^A-Za-z'.\s-]/g, " ")
    .split(/[\s.-]+/)
    .map((x) => x.replace(/^'+|'+$/g, ""))
    .filter((x) => x.length > 0);
  const nama = token.filter((x) => !BUKAN_NAMA.has(x.toUpperCase()));
  const hasil = nama.join(" ").toUpperCase().trim();
  return (hasil.replace(/[^A-Z]/g, "").length >= 3 ? hasil : "");
}

/** Token nama dari teks campuran sisa OCR: hanya kata berhuruf kapital (nama pada akta selalu kapital). */
function tokenKapital(mentah: string): string {
  // Huruf kecil yang terselip karena salah baca ("SIMANGUNsoNG") masih diterima bila sebagian besar kapital.
  const kapital = (x: string) => x.length >= 2 && /^[A-Za-z']+$/.test(x) && (x.match(/[A-Z]/g) ?? []).length / x.replace(/'/g, "").length >= 0.7;
  return mentah
    .split(/[^A-Za-z']+/)
    .filter((x) => kapital(x) && !BUKAN_NAMA.has(x.toUpperCase()))
    .map((x) => x.toUpperCase())
    .join(" ");
}

export function parseAkta(baris: BarisOcr[], namaTarget = ""): HasilAkta {
  const lines: BarisGabung[] = susunBaris(baris.map((b) => ({ ...b, teks: bersihkanTeks(b.teks) })));
  const teks = lines.map((l) => l.teks);
  const fields: HasilParser = { tempat_lahir: kosong(), jenis_kelamin: kosong(), nama_ayah: kosong(), nama_ibu: kosong() };
  const peringatan: string[] = [];

  // ---- tempat lahir: "bahwa di <TEMPAT>" sampai "pada tanggal", koma, atau "hari"
  const iBahwa = teks.findIndex((t) => J_BAHWA.test(t));
  if (iBahwa >= 0) {
    const sisa = teks[iBahwa].slice(teks[iBahwa].search(J_BAHWA)).replace(J_BAHWA, "").replace(/^[\W_]+/, "");
    // Nama tempat berhenti di tanda baca pertama, "pada tanggal", atau kata hari. Tulisan "hari" sering salah baca ("han", "bhan").
    const potong = sisa.split(/[.,;:]|\bpada\b|\bta\w{0,2}g+\w{0,2}l\b|\bhari\b|\bthat\b/i)[0];
    // Awalan wilayah dibuang di mana pun posisinya (OCR bisa mengulang: "Kabu Kabupaten Kudus").
    const kata = potong.replace(/[^A-Za-z\s]/g, " ").replace(/\b(kab\w*|kota)\b/gi, " ").replace(/\s+/g, " ").trim().split(" ");
    // Nama hari ("Senin", "Wage") dan sisa kata "hari" di depannya ("han", "bhan") bukan bagian nama tempat.
    const iHari = kata.findIndex((t) => NAMA_HARI.has(t.toLowerCase()));
    const batas = iHari < 0 ? kata.length : iHari > 0 && /^(b|l)?h[a-z]{1,3}$/i.test(kata[iHari - 1]) ? iHari - 1 : iHari;
    const tempat = kata.slice(0, batas).join(" ");
    if (tempat.replace(/\s/g, "").length >= 3 && !hurufBerspasi(potong)) {
      fields.tempat_lahir = bungkus(tempat.toUpperCase(), keyakinan(lines[iBahwa].skor));
    }
  }

  // ---- tanggal lahir: dari "tanggal" (sesudah "bahwa di") sampai "telah lahir", melewati baris bahasa Inggris
  const mulaiCari = Math.max(0, iBahwa);
  let iTanggal = -1;
  for (let i = mulaiCari; i < Math.min(teks.length, mulaiCari + 6); i++) if (iTanggal < 0 && J_TANGGAL.test(teks[i])) iTanggal = i;
  let iLahir = -1;
  for (let i = Math.max(0, iTanggal); i < Math.min(teks.length, Math.max(0, iTanggal) + 5); i++) if (iLahir < 0 && J_LAHIR.test(teks[i])) iLahir = i;
  let tanggalLahir: string | null = null;
  if (iTanggal >= 0) {
    const bagian: string[] = [];
    for (let i = iTanggal; i <= (iLahir >= 0 ? iLahir : Math.min(teks.length - 1, iTanggal + 2)); i++) {
      let t = teks[i];
      if (i === iTanggal) t = t.slice(t.search(J_TANGGAL)).replace(J_TANGGAL, "");
      if (i === iLahir) t = t.slice(0, t.search(J_LAHIR) >= 0 ? t.search(J_LAHIR) : t.length);
      // Baris campuran ("that in a da tanggl delapan belas Nopember"): buang bagian Inggris di depannya saja.
      if (i !== iTanggal && INGGRIS.test(t) && !/[a-z]{3,}\s+(belas|puluh|ribu)/i.test(t)) continue;
      bagian.push(t);
    }
    tanggalLahir = tanggalDariKata(bagian.join(" ")) ?? parseTanggal(bagian.join(" "));
  }

  // ---- klausa orang tua: baris pertama sesudah tanggal yang memuat "dari" dan ayah/suami-istri
  const awalKlausa = Math.max(iLahir, iTanggal, iBahwa, 0);
  let iKlausa = -1;
  for (let i = awalKlausa; i < teks.length; i++) {
    if (J_DARI.test(teks[i]) && J_ORTU.test(teks[i]) && !INGGRIS.test(teks[i].split(J_DARI)[0])) {
      iKlausa = i;
      break;
    }
  }

  // ---- nama anak: baris bernama tepat di atas klausa (melewati "anak ke", "(Anak Ketiga)", dan baris Inggris)
  let nama = "";
  if (iKlausa > 0) {
    for (let i = iKlausa - 1; i >= Math.max(0, awalKlausa); i--) {
      const t = teks[i];
      if (/\banak\b|was born|on year|\blahir\b|tahun|tanggal/i.test(t) || INGGRIS.test(t)) {
        // "telah lahir : NAMA" pada baris yang sama
        const sesudahLahir = t.search(/lahir\W*:/i) >= 0 ? t.slice(t.search(/lahir\W*:/i)).replace(/lahir\W*:/i, "") : "";
        if (sesudahLahir && namaOrang(sesudahLahir)) {
          nama = namaOrang(sesudahLahir);
          break;
        }
        continue;
      }
      const calon = namaOrang(t);
      if (calon) {
        nama = calon;
        break;
      }
    }
  }

  if (iKlausa >= 0) {
    const klausa: BarisGabung[] = [];
    for (let i = iKlausa; i < Math.min(teks.length, iKlausa + 4); i++) {
      if (i > iKlausa && J_AKHIR_KLAUSA.test(teks[i])) break;
      klausa.push(lines[i]);
    }
    // Terjemahan utuh ("FROM FATHER ... AND MOTHER ...") dibuang; sisa awalan "child no" dipangkas, isinya tetap dipakai.
    const indonesia = klausa
      .map((l) => l.teks)
      .filter((t) => !/from\s*f\w*ther/i.test(t))
      .map((t) => t.replace(/^\W*(child|chld)\s*n\w?\b/i, ""));
    const gabungId = indonesia.join(" ");
    const gabungEn = klausa.map((l) => l.teks).find((t) => /from\s*f\w*ther/i.test(t)) ?? "";
    // Keyakinan dari baris yang menyumbang isi saja (baris klausa dan baris lanjutan bernama), bukan baris sampah di sekitarnya.
    const skor = Math.min(...klausa.filter((l, i) => i === 0 || tokenKapital(l.teks)).map((l) => l.skor));

    // ---- jenis kelamin dari klausa
    const sebelumDari = gabungId.split(J_DARI)[0];
    const jk = /p\w?r\w?mp\w?an|perem/i.test(sebelumDari) ? "P" : /lak[i1l]/i.test(sebelumDari) ? "L" : /daughter/i.test(gabungEn) ? "P" : /\bson\b/i.test(gabungEn) ? "L" : "";
    if (jk) fields.jenis_kelamin = bungkus(jk, keyakinan(skor));

    // ---- ayah dan ibu
    let ayah = "";
    let ibu = "";
    // Pola baru dibaca per baris: nama ibu berhenti di akhir barisnya, kecuali barisnya terpotong (lanjut ke baris berikut).
    const iAyah = indonesia.findIndex((t) => /dari\s*ayah/i.test(t));
    const barisAyah = iAyah >= 0 ? (/\bibu\b/i.test(indonesia[iAyah]) ? indonesia[iAyah] : indonesia.slice(iAyah, iAyah + 2).join(" ")) : "";
    const pola = barisAyah.match(/dari\s*ayah\s*(.+?)\s+dan\s+ibu\s*(.+)$/i);
    if (pola) {
      ayah = namaOrang(pola[1]);
      ibu = namaOrang(pola[2]);
    } else {
      const m = gabungId.match(/suami\W{0,3}\S*\s*(?:sah)?\s*:?/i);
      if (m) {
        const sesudah = gabungId.slice((m.index ?? 0) + m[0].length);
        const bagian = sesudah.split(/(?:\b|\.)(?:dan|dn|d\s?an)(?:\b|\.)/i);
        if (bagian.length >= 2) {
          // Bagian yang memuat angka (tanggal, nomor) bukan nama: dikosongkan, tidak disaring menjadi nama.
          const nm = (b: string) => (/\d/.test(b) ? "" : namaOrang(tokenKapital(b)));
          ayah = nm(bagian[0]);
          ibu = nm(bagian.slice(1).join(" "));
        }
      }
    }
    // Akta dwibahasa: terjemahan Inggris dipakai sebagai pemeriksa. Berbeda berarti salah satu salah baca.
    const en = gabungEn.match(/from\s*f\w*ther\s+(.+?)\s+and\s+mother\s+(.+)$/i);
    const pilih = (nilai: string, pembanding: string | undefined) => {
      const dasar = keyakinan(skor);
      const p = pembanding ? namaOrang(pembanding) : "";
      if (!p) return bungkus(nilai, dasar);
      const huruf = (x: string) => x.replace(/[^A-Z]/g, "");
      // Huruf sama, spasi berbeda ("FITRIYANTI" dan "FITRI YANTI"): pakai pemisahan kata yang lebih rinci.
      if (huruf(nilai) === huruf(p)) return bungkus(p.split(" ").length > nilai.split(" ").length ? p : nilai, dasar);
      return bungkus(nilai, kemiripanNama(nilai, p) >= 0.95 ? dasar : "LOW");
    };
    if (ayah) fields.nama_ayah = pilih(ayah, en?.[1]);
    if (ibu) fields.nama_ibu = pilih(ibu, en?.[2]);
  }

  if (namaTarget && nama && kemiripanNama(namaTarget, nama) < 0.6) {
    peringatan.push(`Nama di Akta ("${nama}") berbeda dengan nama di Langkah 1. Periksa kembali.`);
  }
  if (!fields.tempat_lahir.nilai && !tanggalLahir) peringatan.push("Tempat dan tanggal lahir tidak ditemukan di Akta.");

  return { fields, tanggalLahir, nama, peringatan };
}
