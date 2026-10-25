import { periksaNik, periksaNoKk, cocokProvinsi, PROVINSI } from "../nik";
import { bersihkanTeks, bungkus, kemiripanNama, koreksiAngka, kosong, levenshtein, parseTanggal, susunBaris } from "../normalisasi";
import type { BarisOcr, FieldOcr, HasilParser, Keyakinan } from "../tipe";

// Parser Kartu Keluarga (PRD v4 11.3). KK adalah tabel: setiap anggota satu baris (nama, NIK, jenis kelamin, tempat dan
// tanggal lahir), dan tabel bawah memuat nama ayah dan ibu tiap anggota pada nomor baris yang sama. Parser bekerja pada
// kotak hasil baca (bukan teks per baris), karena foto miring membuat sel satu baris tidak sejajar sempurna.
// Setiap NIK diperiksa silang dengan tanggal lahir di barisnya; yang tidak cocok dan tidak bisa diperbaiki dikosongkan.

/**
 * `tanggalRagu` true bila tanggal lahir terbaca dengan huruf di tempat angka, atau diambil dari kotak di sekitar baris
 * (foto miring): tidak dipakai menilai NIK. `posisiKoreksi` adalah posisi digit NIK yang berasal dari huruf mirip angka.
 */
export type AnggotaKk = {
  no: number | null;
  nama: string;
  nik: string;
  posisiKoreksi: number[];
  tanggalLahir: string | null;
  tanggalRagu: boolean;
  jk: "L" | "P" | "";
  y: number;
};
export type HasilKk = { fields: HasilParser; anggota: AnggotaKk[]; peringatan: string[] };

type Kotak = BarisOcr & { cx: number; cy: number; t: number };

const kotakDari = (b: BarisOcr): Kotak => ({ ...b, cx: (b.kotak[0] + b.kotak[2]) / 2, cy: (b.kotak[1] + b.kotak[3]) / 2, t: Math.max(8, b.kotak[3] - b.kotak[1]) });

// ------------------------------------------------------------------ label kepala KK (tahan salah baca)

type DefLabel = { kunci: string; kata: string[]; pola?: RegExp };
const LABEL_KEPALA: DefLabel[] = [
  { kunci: "kepala", kata: ["kepala", "keluarga"] },
  { kunci: "alamat", kata: ["alamat"] },
  { kunci: "rtrw", kata: [], pola: /\bR\s*T\s*\/?\s*R\s*W\b/i },
  { kunci: "kodepos", kata: ["kode", "pos"] },
  { kunci: "desa", kata: ["desa", "kelurahan"] },
  { kunci: "kecamatan", kata: ["kecamatan"] },
  { kunci: "kabupaten", kata: ["kabupaten", "kota"] },
  { kunci: "propinsi", kata: ["provinsi"] },
];

const batas = (n: number) => (n <= 4 ? 1 : n <= 7 ? 2 : 2);
const mirip = (token: string, kata: string) => levenshtein(token, kata) <= batas(kata.length);

/** Rentang label pada satu baris teks. Kata label boleh terpecah ("KeCa matan") atau menempel ("KabupatenMota"). */
function cariLabel(teks: string): { kunci: string; awal: number; akhir: number }[] {
  const token = [...teks.matchAll(/[A-Za-z]+/g)].map((m) => ({ t: m[0].toLowerCase(), awal: m.index ?? 0, akhir: (m.index ?? 0) + m[0].length }));
  const temu: { kunci: string; awal: number; akhir: number }[] = [];
  for (const def of LABEL_KEPALA) {
    if (def.pola) {
      for (const m of teks.matchAll(new RegExp(def.pola.source, "gi"))) temu.push({ kunci: def.kunci, awal: m.index ?? 0, akhir: (m.index ?? 0) + m[0].length });
      continue;
    }
    for (let i = 0; i < token.length; i++) {
      // Kata utama: kata pertama label (atau kata kedua untuk "kepala keluarga", karena "nama" sering hilang).
      for (let k = 0; k < def.kata.length; k++) {
        const kata = def.kata[k];
        const satu = token[i].t;
        const dua = token[i + 1] ? satu + token[i + 1].t : "";
        const awalan = satu.length > kata.length + 2 ? satu.slice(0, kata.length) : satu;
        let pakai = 0;
        if (mirip(awalan, kata)) pakai = 1;
        else if (dua && mirip(dua, kata)) pakai = 2;
        if (!pakai) continue;
        if (def.kunci === "kepala" && k === 0 && !(token[i + pakai] && mirip(token[i + pakai].t, "keluarga"))) continue;
        if (def.kunci === "kodepos" && k === 0 && !(token[i + pakai] && mirip(token[i + pakai].t, "pos"))) continue;
        if (def.kunci === "kodepos" && k === 1) continue;
        // "Kota" sendirian bukan label: itu bagian nilai ("KOTA AMBON") sesudah label "Kabupaten/Kota".
        if (def.kunci === "kabupaten" && k > 0) continue;
        if (def.kunci === "kepala" && k === 1 && !(i > 0 && mirip(token[i - 1].t, "kepala"))) continue;
        let akhir = token[i + pakai - 1].akhir;
        // Kata label sisanya ("Kelurahan" sesudah "Desa", "Kota" sesudah "Kabupaten") ikut dimakan.
        for (let s = k + 1, j = i + pakai; s < def.kata.length && token[j]; s++, j++) if (mirip(token[j].t, def.kata[s])) akhir = token[j].akhir;
        temu.push({ kunci: def.kunci, awal: token[i].awal, akhir });
        break;
      }
    }
  }
  temu.sort((a, b) => a.awal - b.awal || b.akhir - a.akhir);
  const bersih: typeof temu = [];
  for (const t of temu) if (!bersih.length || t.awal >= bersih[bersih.length - 1].akhir) bersih.push(t);
  return bersih;
}

// ------------------------------------------------------------------ anggota keluarga

/** Calon NIK di dalam teks (boleh ada satu spasi di tengah, huruf mirip angka dikoreksi). */
function cariNik(teks: string): { nilai: string; posisiKoreksi: number[]; awal: number; akhir: number } | null {
  for (const m of teks.matchAll(/[0-9OoIl|SBZDQG]{6,}(?:\s?[0-9OoIl|SBZDQG]{2,})*/g)) {
    const rapat = m[0].replace(/\s/g, "");
    if (rapat.length !== 16 || (rapat.match(/\d/g) ?? []).length < 11) continue;
    const k = koreksiAngka(rapat).nilai;
    const posisiKoreksi = [...rapat].map((c, i) => (/\d/.test(c) ? -1 : i)).filter((i) => i >= 0);
    if (/^\d{16}$/.test(k)) return { nilai: k, posisiKoreksi, awal: m.index ?? 0, akhir: (m.index ?? 0) + m[0].length };
  }
  return null;
}

/** Tanggal dd-mm-yyyy yang seluruhnya angka (tanpa huruf yang dikoreksi). */
const TANGGAL_BERSIH = /\b\d{1,2}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{4}\b/;

const JK = (s: string): "L" | "P" | "" => (/p\w?r\w?m\w?p\w?[ua]a?n|perem|puan/i.test(s) ? "P" : /l\w?k\w?\W?l\w?k|laki/i.test(s) ? "L" : "");
const namaRapi = (s: string) => s.replace(/[^A-Za-z .,']/g, " ").replace(/\s+/g, " ").replace(/^[\s.,']+|[\s.,']+$/g, "").toUpperCase();
const sebaris = (a: Kotak, b: Kotak, kali = 0.7) => Math.abs(a.cy - b.cy) <= kali * Math.min(a.t, b.t);

function barisAnggota(kotak: Kotak[], batasAtas: number): AnggotaKk[] {
  const hasil: AnggotaKk[] = [];
  for (const k of kotak) {
    if (k.cy <= batasAtas) continue;
    const nik = cariNik(k.teks);
    if (!nik) continue;
    const segaris = kotak.filter((x) => x !== k && sebaris(x, k));
    const kiri = [...segaris.filter((x) => x.kotak[2] <= k.kotak[0] + 5).sort((a, b) => a.kotak[0] - b.kotak[0]).map((x) => x.teks), k.teks.slice(0, nik.awal)];
    const kanan = [k.teks.slice(nik.akhir), ...segaris.filter((x) => x.kotak[0] >= k.kotak[2] - 5).sort((a, b) => a.kotak[0] - b.kotak[0]).map((x) => x.teks)].join(" ");
    const teksKiri = kiri.join(" ").trim();
    const no = teksKiri.match(/^\s*(\d{1,2})\b/);
    const nama = namaRapi(teksKiri.replace(/^\s*\d{1,2}[\s.)]*/, ""));
    // Tanggal lahir: di kanan NIK pada baris yang sama; bila foto miring, kotak tanggal terdekat sedikit di atas atau bawah.
    let tanggal = parseTanggal(kanan);
    let tanggalRagu = tanggal === null || !TANGGAL_BERSIH.test(kanan);
    if (!tanggal) {
      const dekat = kotak.filter((x) => x.kotak[0] >= k.kotak[2] && sebaris(x, k, 1.4) && parseTanggal(x.teks)).sort((a, b) => Math.abs(a.cy - k.cy) - Math.abs(b.cy - k.cy))[0];
      tanggal = dekat ? parseTanggal(dekat.teks) : null;
      tanggalRagu = true;
    }
    hasil.push({
      no: no ? Number(no[1]) : null,
      nama: (nama.match(/[A-Z]/g) ?? []).length >= 3 ? nama : "",
      nik: nik.nilai,
      posisiKoreksi: nik.posisiKoreksi,
      tanggalLahir: tanggal,
      tanggalRagu,
      jk: JK(kanan),
      y: k.cy,
    });
  }
  return hasil.sort((a, b) => a.y - b.y);
}

// ------------------------------------------------------------------ tabel nama orang tua

const BUKAN_NAMA_ORTU = /^(wni|wna|anak|istri|isteri|kepala|keluarga|kawin|belum|cerai|famili|lain|mertua|cucu|menantu|orang|tua|ayah|ibu|lbu|no|paspor|kitap|kitas|status|hubungan|kewarganegaraan|dokumen|imigrasi)$/i;

type Ortu = { ayah: string; ibu: string; skor: number };

const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN);
/** Sel nomor kolom tabel KK, mis. "(2)", "14)", "(15". */
const NOMOR_KOLOM = /^\W*\(?\s*(\d{1,2})\s*\)?\W*$/;

/**
 * Nama ayah dan ibu calon siswa dari tabel bawah KK. Kedua tabel KK punya tinggi baris yang sama, jadi baris orang tua
 * siswa berada pada jarak yang sama dari baris nomor kolom tabel bawah ("(14) (15)") seperti baris siswa dari baris
 * nomor kolom tabel atas ("(1) (2)"). Cara ini tetap jalan walau sel status atau nomor urut tidak terbaca.
 */
function ortuSiswa(kotak: Kotak[], anggota: AnggotaKk[], siswa: AnggotaKk, kepalaTabelY: number | null): Ortu | null {
  const atasY = Math.min(...anggota.map((a) => a.y));
  const bawahY = Math.max(...anggota.map((a) => a.y));
  const bawah = kotak.filter((k) => k.cy > bawahY);
  const kAyah = bawah.filter((k) => /^\W*a?y\s*a?[hd]\W*$/i.test(k.teks) || /\bayah\b/i.test(k.teks)).sort((a, b) => a.cy - b.cy)[0];
  if (!kAyah) return null;
  const kIbu = bawah.find((k) => Math.abs(k.cy - kAyah.cy) <= 2 * kAyah.t && k.cx > kAyah.cx && (/^\W*[il1|]\s*b\s*u\W*$/i.test(k.teks) || /\b[il1]bu\b/i.test(k.teks)));
  const ayahX = kAyah.cx;
  const ibuX = kIbu ? kIbu.cx : null;

  const jarakBaris = median(anggota.map((a, i) => (i ? a.y - anggota[i - 1].y : NaN)).filter((d) => d > 5)) || 1.4 * kAyah.t;

  // Baris nomor kolom: kotak "(n)" tepat di atas baris anggota pertama, dan di bawah kepala kolom Ayah.
  const nomorAtas = kotak.filter((k) => NOMOR_KOLOM.test(k.teks) && k.cy < atasY && k.cy > atasY - 2.5 * jarakBaris);
  const nomorBawah = bawah.filter((k) => NOMOR_KOLOM.test(k.teks) && k.cy > kAyah.cy && k.cy < kAyah.cy + 2.5 * jarakBaris);
  let harapan: number | null = null;
  if (nomorAtas.length && nomorBawah.length) harapan = median(nomorBawah.map((k) => k.cy)) + (siswa.y - median(nomorAtas.map((k) => k.cy)));
  else if (kepalaTabelY !== null) harapan = kAyah.cy + (siswa.y - kepalaTabelY);
  if (harapan === null) return null;

  const kiriBatas = kAyah.kotak[0] - Math.max(40, (ibuX !== null ? ibuX - ayahX : 200) * 0.6);
  const sel = bawah
    .filter((k) => Math.abs(k.cy - harapan!) <= 0.75 * jarakBaris && k.kotak[0] >= kiriBatas)
    .filter((k) => namaRapi(k.teks).split(" ").some((w) => w.length >= 2 && !BUKAN_NAMA_ORTU.test(w)));
  if (!sel.length) return null;
  // Per kolom, kotak yang paling dekat dengan posisi harapan (foto miring menggeser baris beberapa piksel).
  const ambil = (x: number, lawan: number | null) => {
    const kolom = sel.filter((k) => lawan === null || Math.abs(k.cx - x) < Math.abs(k.cx - lawan));
    const terdekat = kolom.sort((a, b) => Math.abs(a.cy - harapan!) - Math.abs(b.cy - harapan!))[0];
    return terdekat ? { nama: namaRapi(kolom.filter((k) => sebaris(k, terdekat, 0.5)).sort((a, b) => a.kotak[0] - b.kotak[0]).map((k) => k.teks).join(" ")), skor: terdekat.skor } : null;
  };
  const ayah = ambil(ayahX, ibuX);
  const ibu = ibuX === null ? null : ambil(ibuX, ayahX);
  return { ayah: ayah?.nama ?? "", ibu: ibu?.nama ?? "", skor: Math.min(ayah?.skor ?? 1, ibu?.skor ?? 1) };
}

// ------------------------------------------------------------------ utama

function keyakinan(skor: number, dasar: Keyakinan = "HIGH"): Keyakinan {
  const k: Keyakinan = skor >= 0.85 ? "HIGH" : skor >= 0.7 ? "MEDIUM" : "LOW";
  const urut: Keyakinan[] = ["LOW", "MEDIUM", "HIGH"];
  return urut[Math.min(urut.indexOf(k), urut.indexOf(dasar))];
}

const namaWajar = (s: string) => s.replace(/[^A-Za-z]/g, "").length >= 3 && !/\d/.test(s);

export function parseKk(baris: BarisOcr[], namaTarget: string): HasilKk {
  const kotak = baris.map((b) => kotakDari({ ...b, teks: bersihkanTeks(b.teks) })).filter((k) => k.teks.trim() !== "");
  const lines = susunBaris(kotak);
  const fields: HasilParser = {};
  const peringatan: string[] = [];

  // Batas tabel anggota: baris kepala tabel ("Nama Lengkap", "NIK").
  const kepalaTabel = lines.find((l) => /nama\s*lengkap|\bn\s*[il1]\s*k\b/i.test(l.teks) && /nama|jenis|lahir/i.test(l.teks));
  const batasTabel = kepalaTabel ? kepalaTabel.y - 2 : -Infinity;

  // ---- Nomor KK: deret 16 digit pertama di atas tabel, dengan tanggal terbit yang sah
  fields.no_kk = kosong();
  for (const l of lines) {
    if (l.y >= batasTabel && kepalaTabel) break;
    const n = cariNik(l.teks);
    if (!n) continue;
    const cek = periksaNoKk(n.nilai);
    if (cek.nilai) {
      fields.no_kk = bungkus(cek.nilai, keyakinan(l.skor));
      break;
    }
  }
  const noKk = fields.no_kk.nilai;

  // ---- Alamat dan wilayah: pasangan label dan nilai di atas tabel
  for (const k of ["alamat", "rt", "rw", "desa", "kecamatan", "kabupaten", "propinsi"]) fields[k] = kosong();
  for (const l of lines) {
    if (kepalaTabel && l.y >= batasTabel) break;
    const label = cariLabel(l.teks);
    label.forEach((lb, i) => {
      const nilai = l.teks.slice(lb.akhir, label[i + 1]?.awal ?? l.teks.length).replace(/^[\s:;.,|]+/, "").replace(/[\s:;|]+$/, "").trim();
      if (!nilai) return;
      const yakin = keyakinan(l.skor);
      if (lb.kunci === "rtrw") {
        const m = nilai.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
        if (m && !fields.rt.nilai) {
          fields.rt = bungkus(m[1].padStart(3, "0"), yakin);
          fields.rw = bungkus(m[2].padStart(3, "0"), yakin);
        }
      } else if (lb.kunci === "propinsi") {
        const p = cocokProvinsi(nilai, levenshtein);
        if (p && !fields.propinsi.nilai) fields.propinsi = bungkus(p, PROVINSI[noKk.slice(0, 2)] === p ? "HIGH" : "MEDIUM");
      } else if (["alamat", "desa", "kecamatan", "kabupaten"].includes(lb.kunci) && !fields[lb.kunci].nilai) {
        let v = nilai.replace(/[^A-Za-z0-9 .,'/-]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
        // "KOTADUMAI" menjadi "KOTA DUMAI". Nama yang memang diawali Kota (Kotamobagu, Kotabaru, Kotawaringin) dibiarkan.
        if (lb.kunci === "kabupaten") v = v.replace(/^(KOTA|KABUPATEN)(?=(?!MOBAGU|BARU|WARINGIN|GAJAH|BUMI|ANYAR|AGUNG|BANGUN)[A-Z]{4,}$)/, "$1 ");
        const sehat = lb.kunci === "alamat" ? v.replace(/[^A-Z0-9]/g, "").length >= 3 : namaWajar(v);
        fields[lb.kunci] = sehat ? bungkus(v, yakin) : { nilai: "", keyakinan: "LOW" };
      }
    });
  }
  // Provinsi tak terbaca tetapi Nomor KK sah: provinsi dari dua digit pertama Nomor KK.
  if (!fields.propinsi.nilai && noKk && PROVINSI[noKk.slice(0, 2)]) fields.propinsi = bungkus(PROVINSI[noKk.slice(0, 2)], "MEDIUM");

  // ---- Anggota keluarga
  const anggota = barisAnggota(kotak, kepalaTabel ? batasTabel : (lines.find((l) => cariNik(l.teks))?.y ?? -Infinity));
  const wilayahKk = noKk ? noKk.slice(0, 6) : undefined;
  const nikAnggota = (a: AnggotaKk): FieldOcr =>
    periksaNik(a.nik, { tanggal: a.tanggalLahir, jk: a.jk, wilayahKk, tanggalRagu: a.tanggalRagu, posisiKoreksi: a.posisiKoreksi });

  fields.nik = kosong();
  let siswa: AnggotaKk | undefined;
  if (namaTarget.trim().length >= 3 && anggota.length > 0) {
    const urut = anggota.filter((a) => a.nama).map((a) => ({ a, s: kemiripanNama(namaTarget, a.nama) })).sort((x, y) => y.s - x.s);
    const terbaik = urut[0];
    if (!terbaik || terbaik.s < 0.7) {
      peringatan.push("Nama calon siswa tidak ditemukan di Kartu Keluarga. Periksa nama di Langkah 1 atau isi NIK secara manual.");
    } else {
      siswa = terbaik.a;
      const cek = nikAnggota(siswa);
      if (!cek.nilai) {
        peringatan.push("NIK calon siswa tidak terbaca jelas. Isi NIK secara manual.");
        fields.nik = { nilai: "", keyakinan: "LOW" };
      } else {
        fields.nik = bungkus(cek.nilai, terbaik.s >= 0.85 ? cek.keyakinan : "MEDIUM");
      }
    }
  } else if (anggota.length === 0) {
    peringatan.push("Daftar anggota keluarga tidak terbaca.");
  }

  // ---- Nama dan NIK orang tua dari tabel bawah, baris dengan nomor yang sama dengan baris siswa
  for (const k of ["nama_ayah", "nama_ibu", "nik_ayah", "nik_ibu"]) fields[k] = kosong();
  if (siswa) {
    const baris = ortuSiswa(kotak, anggota, siswa, kepalaTabel ? kepalaTabel.y : null);
    if (baris) {
      for (const [kunci, kNik, nama, jk] of [["nama_ayah", "nik_ayah", baris.ayah, "L"], ["nama_ibu", "nik_ibu", baris.ibu, "P"]] as const) {
        if (!namaWajar(nama)) continue;
        // Orang tua yang tercatat sebagai anggota: namanya dikuatkan dan NIK-nya diambil dari baris anggotanya.
        const calon = anggota
          .filter((a) => a !== siswa && a.nama)
          .map((a) => ({ a, s: kemiripanNama(nama, a.nama) }))
          .sort((x, y) => y.s - x.s);
        // Anggota yang dimaksud: mirip (salah baca ringan di salah satu tabel masih diterima) dan jelas unggul dari calon lain.
        const unggul = calon[0] && calon[0].s >= 0.75 && (!calon[1] || calon[0].s - calon[1].s >= 0.2);
        const cocok = unggul ? calon[0].a : undefined;
        // Baris tabel bawah bisa meleset pada foto miring, jadi nama orang tua hanya diisi bila dikuatkan oleh baris
        // anggota yang sama persis ejaannya (dua pembacaan sepakat). Nama di luar anggota KK tidak diisi: Akta sumbernya.
        const sepakat = cocok && cocok.nama.replace(/[^A-Z]/g, "") === nama.replace(/[^A-Z]/g, "");
        fields[kunci] = sepakat ? bungkus(cocok.nama, keyakinan(baris.skor)) : { nilai: "", keyakinan: "LOW" };
        if (cocok) {
          const cek = periksaNik(cocok.nik, { tanggal: cocok.tanggalLahir, jk: cocok.jk || jk, wilayahKk, tanggalRagu: cocok.tanggalRagu, posisiKoreksi: cocok.posisiKoreksi });
          fields[kNik] = cek.nilai ? bungkus(cek.nilai, cek.keyakinan) : { nilai: "", keyakinan: "LOW" };
        }
      }
    }
  }

  return { fields, anggota, peringatan };
}
