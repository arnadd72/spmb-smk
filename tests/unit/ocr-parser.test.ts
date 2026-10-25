// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bersihkanTeks, cariDeret16, kemiripanNama, parseTanggal, susunBaris } from "@/lib/ocr/normalisasi";
import { parseAkta } from "@/lib/ocr/parser/akta";
import { parseKk } from "@/lib/ocr/parser/kk";
import type { BarisOcr } from "@/lib/ocr/tipe";

/** Satu potongan teks per baris, tersusun ke bawah (cukup untuk parser berbasis label). */
const dariBaris = (baris: string[]): BarisOcr[] =>
  baris.map((teks, i) => ({ teks, kotak: [0, i * 40, 600, i * 40 + 30], skor: 0.95 }));

describe("normalisasi", () => {
  it("membuang huruf non-Latin dari stempel", () => {
    expect(bersihkanTeks("1E电S线 S2 酸 :13")).toBe("1E S S2 :13");
  });

  it("memperbaiki angka tertukar huruf pada deret 16 digit, tetapi tidak menebak 15 atau 17 digit", () => {
    expect(cariDeret16("NIK 3301012204780001")).toEqual([{ nilai: "3301012204780001", diperbaiki: false }]);
    expect(cariDeret16("NIK 33O1012204780OO1")).toEqual([{ nilai: "3301012204780001", diperbaiki: true }]);
    expect(cariDeret16("330101230210")).toEqual([]);
    expect(cariDeret16("33010123021000001")).toEqual([]);
  });

  it("membaca tanggal berbagai format dan tahun yang tertukar huruf", () => {
    expect(parseTanggal("12-05-2010")).toBe("2010-05-12");
    expect(parseTanggal("12 Mei 2010")).toBe("2010-05-12");
    expect(parseTanggal("CILACAP, 12 Mei 2010")).toBe("2010-05-12");
    expect(parseTanggal("22-04.197B")).toBe("1978-04-22");
    expect(parseTanggal("31-02-2010")).toBeNull();
    expect(parseTanggal("tidak ada tanggal")).toBeNull();
  });

  it("mencocokkan nama walau kata menempel atau urutannya berbeda", () => {
    expect(kemiripanNama("Siti Nurhaliza", "SITINURHALIZA")).toBeGreaterThan(0.9);
    expect(kemiripanNama("Nurhaliza Siti", "SITI NURHALIZA")).toBeGreaterThan(0.9);
    expect(kemiripanNama("Ahmad Fauzi", "Budi Santoso")).toBeLessThan(0.5);
  });

  it("menyusun potongan sejajar menjadi satu baris berurutan dari kiri ke kanan", () => {
    const baris = susunBaris([
      { teks: "B", kotak: [200, 10, 240, 40], skor: 0.9 },
      { teks: "A", kotak: [20, 12, 60, 42], skor: 0.9 },
      { teks: "C", kotak: [20, 100, 60, 130], skor: 0.9 },
    ]);
    expect(baris.map((b) => b.teks)).toEqual(["A B", "C"]);
  });
});

// Teks nyata dari uji KK di HP (data pribadi disamarkan: NIK dan nama diganti, kesalahan baca OCR dipertahankan).

/** Potongan teks per sel tabel (gaya per-box): [teks, x, y]. Tinggi kotak 20 piksel, lebar sebanding panjang teks. */
const sel = (isi: [string, number, number][]): BarisOcr[] =>
  isi.map(([teks, x, y]) => ({ teks, kotak: [x, y, x + teks.length * 9, y + 20], skor: 0.95 }));

// KK rekaan bergaya foto HP: kepala keluarga, istri, anak tiri dari suami terdahulu, dan anak kandung.
const KK_SEL = sel([
  ["KARTU KELUARGA", 400, 10],
  ["No.3301010406080001", 380, 40],
  ["Nama Kepala Keluarga", 20, 80], [": SUTARNO", 220, 80], ["KeCa matan", 600, 80], [": KEDUNGREJA", 760, 80],
  ["AlaMat", 20, 110], [": DUSUN SIDAURIP", 220, 110], ["Kabupsten/Kotn", 600, 110], [": CILACAP", 760, 110],
  ["RT/RW", 20, 140], [": 003/005", 220, 140], ["Kode Pos", 600, 140], [": 53263", 760, 140],
  ["Desa/Kekurahan", 20, 170], [": SIDANEGARA", 220, 170], ["Provinai", 600, 170], [": AWA TENGAH", 760, 170],
  ["No", 10, 220], ["Nama Lengkap", 60, 220], ["NIK", 330, 220], ["Jenis Kelamin", 520, 220], ["Tempat Lahir", 660, 220], ["Tanggal Lahir", 820, 220],
  ["1", 10, 260], ["SUTARNO", 60, 260], ["3301012204780001", 330, 260], ["LAKI-LAKI", 520, 260], ["CILACAP", 660, 260], ["22-04-1978", 820, 260],
  ["2", 10, 290], ["LISA TRI SAPARININGRUM", 60, 290], ["3301016811830003", 330, 290], ["PEREMPUAN", 520, 290], ["CILACAP", 660, 290], ["28-11-1983", 820, 290],
  ["3", 10, 320], ["DINA MARLINA", 60, 320], ["3301015503050002", 330, 320], ["PEREMPUAN", 520, 320], ["BANYUMAS", 660, 320], ["15-03-2005", 820, 320],
  ["4", 10, 350], ["ARNANDA SETYANOSA PUTRA", 60, 350], ["3301010903060002", 330, 350], ["LAKI-LAKI", 520, 350], ["CILACAP", 660, 350], ["09-03-2006", 820, 350],
  ["Status Perkawinan", 20, 420], ["Status Hubungan Dalam Keluarga", 200, 420], ["Kewarganegaraan", 420, 420], ["Nama Orang Tua", 700, 400], ["Ayah", 640, 420], ["Ibu", 860, 420],
  ["KAWIN", 20, 460], ["KEPALA KELUARGA", 200, 460], ["WNI", 420, 460], ["KARTO", 640, 460], ["SUMINAH", 860, 460],
  ["KAWIN", 20, 490], ["ISTRI", 200, 490], ["WNI", 420, 490], ["HADI", 640, 490], ["RUKMINI", 860, 490],
  ["BELUM KAWIN", 20, 520], ["ANAK", 200, 520], ["WNI", 420, 520], ["SLAMET RIYADI", 640, 520], ["LISA TRI SAPARININGRUM", 860, 520],
  ["BELUM KAWIN", 20, 550], ["ANAK", 200, 550], ["WNI", 420, 550], ["SUTARNO", 640, 550], ["LISA TRI SAPARININGRUM", 860, 550],
]);

describe("parseKk", () => {
  it("membaca nomor KK, alamat, dan wilayah dua kolom walau labelnya salah baca", () => {
    const h = parseKk(KK_SEL, "Arnanda Setyanosa Putra");
    expect(h.fields.no_kk).toEqual({ nilai: "3301010406080001", keyakinan: "HIGH" });
    expect(h.fields.alamat.nilai).toBe("DUSUN SIDAURIP");
    expect([h.fields.rt.nilai, h.fields.rw.nilai]).toEqual(["003", "005"]);
    expect(h.fields.desa.nilai).toBe("SIDANEGARA");
    expect(h.fields.kecamatan.nilai).toBe("KEDUNGREJA");
    expect(h.fields.kabupaten.nilai).toBe("CILACAP");
    // Provinsi dicocokkan ke daftar provinsi: "AWA TENGAH" menjadi "JAWA TENGAH".
    expect(h.fields.propinsi.nilai).toBe("JAWA TENGAH");
  });

  it("NIK calon siswa dari anggota yang namanya paling mirip, cocok dengan tanggal lahirnya", () => {
    const h = parseKk(KK_SEL, "ARNANDA SETYANOSA PUTRA");
    expect(h.fields.nik).toEqual({ nilai: "3301010903060002", keyakinan: "HIGH" });
  });

  it("nama orang tua dari kolom Nama Orang Tua baris siswa, NIK orang tua dari anggota yang namanya sama", () => {
    const h = parseKk(KK_SEL, "Arnanda Setyanosa Putra");
    expect(h.fields.nama_ayah.nilai).toBe("SUTARNO");
    expect(h.fields.nama_ibu.nilai).toBe("LISA TRI SAPARININGRUM");
    expect(h.fields.nik_ayah).toEqual({ nilai: "3301012204780001", keyakinan: "HIGH" });
    expect(h.fields.nik_ibu).toEqual({ nilai: "3301016811830003", keyakinan: "HIGH" });
  });

  it("anak tiri: ayah yang bukan anggota KK tidak diisi dari KK (Akta sumbernya), ibu yang anggota tetap diisi", () => {
    const h = parseKk(KK_SEL, "Dina Marlina");
    expect(h.fields.nama_ayah.nilai).toBe("");
    expect(h.fields.nik_ayah.nilai).toBe("");
    expect(h.fields.nama_ibu.nilai).toBe("LISA TRI SAPARININGRUM");
    expect(h.fields.nik_ibu.nilai).toBe("3301016811830003");
  });

  it("digit NIK yang berasal dari huruf salah koreksi diperbaiki dari kolom tanggal lahir yang bersih (keyakinan sedang)", () => {
    // "G" dikoreksi menjadi 6, padahal seharusnya 8 (68 = tanggal 28 untuk perempuan).
    const rusak = KK_SEL.map((b) => (b.teks === "3301016811830003" ? { ...b, teks: "3301016G11830003" } : b));
    const h = parseKk(rusak, "Lisa Tri Saparininngrum");
    expect(h.fields.nik).toEqual({ nilai: "3301016811830003", keyakinan: "MEDIUM" });
  });

  it("NIK dan tanggal lahir sama-sama bersih tetapi berbeda: tidak tahu mana yang salah, NIK tidak diisi", () => {
    const rusak = KK_SEL.map((b) => (b.teks === "3301016811830003" ? { ...b, teks: "3301016611830003" } : b));
    expect(parseKk(rusak, "Lisa Tri Saparininngrum").fields.nik.nilai).toBe("");
  });

  it("tanggal lahir yang terbaca dengan huruf tidak dipakai menilai NIK: NIK yang sah tetap diisi (keyakinan sedang)", () => {
    const rusak = KK_SEL.map((b) => (b.teks === "09-03-2006" ? { ...b, teks: "O6-03-2OO6" } : b));
    expect(parseKk(rusak, "Arnanda Setyanosa Putra").fields.nik).toEqual({ nilai: "3301010903060002", keyakinan: "MEDIUM" });
  });

  it("NIK yang tidak cocok dengan tanggal lahir dan tidak bisa diperbaiki tidak diisi", () => {
    const rusak = KK_SEL.map((b) => (b.teks === "3301010903060002" ? { ...b, teks: "3301017713990002" } : b));
    const h = parseKk(rusak, "Arnanda Setyanosa Putra");
    expect(h.fields.nik.nilai).toBe("");
    expect(h.peringatan.join(" ")).toMatch(/NIK calon siswa tidak terbaca/);
  });

  it("baris anggota yang terbaca sebagai satu potongan utuh tetap dikenali", () => {
    const h = parseKk(
      dariBaris(["No.3301010406080001", "No Nama Lengkap NIK Jenis Kelamin", "1 AHMAD FAUZI 3301011205100002 LAKI-LAKI CILACAP 12-05-2010 ISLAM"]),
      "Ahmad Fauzi",
    );
    expect(h.fields.nik.nilai).toBe("3301011205100002");
  });

  it("nomor KK yang bagian tanggal terbitnya tidak sah tidak diisi", () => {
    const h = parseKk(dariBaris(["KARTU KELUARGA", "No.3301019913080001"]), "Siapa");
    expect(h.fields.no_kk.nilai).toBe("");
  });

  it("memberi peringatan bila nama siswa tidak ada di KK", () => {
    const h = parseKk(KK_SEL, "Budi Hartono Wijaya");
    expect(h.fields.nik.keyakinan).toBe("NOT_FOUND");
    expect(h.peringatan.join(" ")).toMatch(/tidak ditemukan di Kartu Keluarga/);
  });

  it("KK kosong menghasilkan semua field kosong tanpa galat", () => {
    const h = parseKk(dariBaris(["foto buram", "tidak ada apa-apa"]), "Siapa Saja");
    expect(h.fields.no_kk.nilai).toBe("");
    expect(h.anggota).toHaveLength(0);
    expect(h.peringatan.length).toBeGreaterThan(0);
  });
});

describe("parseAkta: format kalimat Kutipan Akta Kelahiran", () => {
  // Data rekaan yang meniru tiga pola akta asli (dwibahasa baru, lama dengan suami-istri, lama mesin ketik) beserta
  // salah baca OCR yang tercatat pada foto contoh: kata salah eja, kata menempel, nama ibu terpotong ke baris lain.
  const BARU = [
    "KUTIPAN AKTA KELAHIRAN",
    "Berdasarkan Akta Kelahiran Nomor 3301-LT-15052010-0123",
    "bahwa di CILACAP pada tanggal DUA BELAS",
    "that in on date THE TWELFTH OF",
    "MEI tahun DUA RIBU SEPULUH telah lahir",
    "MAY on year TWO THOUSAND AND TEN was born",
    "AHMAD FAUZI RAMADHAN",
    "anak ke DUA, LAKI-LAKI DARI AYAH SUPARNO DAN IBU SITI NURHALIZA",
    "child no SECOND SON FROM FATHER SUPARNO AND MOTHER SITI NURHALIZA",
    "Kutipan ini dikeluarkan di CILACAP",
    "pada tanggal TIGA JULI",
    "Tahun DUA RIBU SEBELAS",
  ];

  it("pola dwibahasa: tempat, tanggal, nama, jenis kelamin, ayah, dan ibu", () => {
    const h = parseAkta(dariBaris(BARU), "Ahmad Fauzi Ramadhan");
    expect(h.fields.tempat_lahir.nilai).toBe("CILACAP");
    expect(h.tanggalLahir).toBe("2010-05-12");
    expect(h.nama).toBe("AHMAD FAUZI RAMADHAN");
    expect(h.fields.jenis_kelamin.nilai).toBe("L");
    expect(h.fields.nama_ayah.nilai).toBe("SUPARNO");
    expect(h.fields.nama_ibu.nilai).toBe("SITI NURHALIZA");
    expect(h.peringatan).toHaveLength(0);
  });

  it("tanggal terbit kutipan tidak tertukar dengan tanggal lahir", () => {
    expect(parseAkta(dariBaris(BARU)).tanggalLahir).toBe("2010-05-12");
  });

  it("pola lama suami-istri: nama ibu terpotong ke baris berikutnya, tanggal huruf salah eja", () => {
    const h = parseAkta(
      dariBaris([
        "ternyata, bahwa di Kabupaten Banyumas, hari Senin",
        "pada tanggal Dua puluh enam Agustue",
        "Tabun Dua Ribu Dua, Jam 14.15 Wib .. telah lahir :",
        "RINA PUSPITA SARI",
        "Anak kedua perempuan dari Suami-1steri BAMBANG SUTEJO",
        "dan LESTARI",
        "Kutipan ini sesuai dengan keadaan pada hari ini.",
      ]),
      "Rina Puspita Sari",
    );
    expect(h.fields.tempat_lahir.nilai).toBe("BANYUMAS");
    expect(h.tanggalLahir).toBe("2002-08-26");
    expect(h.nama).toBe("RINA PUSPITA SARI");
    expect(h.fields.jenis_kelamin.nilai).toBe("P");
    expect(h.fields.nama_ayah.nilai).toBe("BAMBANG SUTEJO");
    expect(h.fields.nama_ibu.nilai).toBe("LESTARI");
  });

  it("pola lama: nama orang tua terpisah ke beberapa baris dan dibuang sisa baca bahasa Inggris", () => {
    const h = parseAkta(
      dariBaris([
        "bahwa di Purwokerto .",
        "that in a da tanggl delapan belas Nopember",
        "tahun dua nibu tujuh telah lahir.",
        "DENI KURNIAWAN",
        "anak ke dua laki-laki dari suami-istri JOKO SANTOSO...dan..",
        "child no aH n ei w DEWI",
        "ANGGRAENI -",
        "The excerpt is issued",
      ]),
    );
    expect(h.fields.tempat_lahir.nilai).toBe("PURWOKERTO");
    expect(h.tanggalLahir).toBe("2007-11-18");
    expect(h.fields.jenis_kelamin.nilai).toBe("L");
    expect(h.fields.nama_ayah.nilai).toBe("JOKO SANTOSO");
    expect(h.fields.nama_ibu.nilai).toBe("DEWI ANGGRAENI");
  });

  it("tempat lahir yang hurufnya terbaca berspasi tidak diisi (tidak menebak)", () => {
    const h = parseAkta(dariBaris(["bahwa di A e e h Ti m u r pada tanggal Duapuluh bulan", "Mei tahun Seribu Sembilanra tus Delapanpuluh Delapan telah lahir"]));
    expect(h.fields.tempat_lahir.nilai).toBe("");
    expect(h.tanggalLahir).toBe("1988-05-20");
  });

  it("nama ayah dan ibu tidak pernah berisi tanggal, tempat, atau kata keterangan", () => {
    const h = parseAkta(dariBaris(["pada tanggal 12 Mei 2010", "Nama Ibu : 12 Mei 2010", "anak perempuan dari suami-istri : 12-05-2010 dan CILACAP, 12 Mei"]));
    expect(h.fields.nama_ayah.nilai).toBe("");
    expect(h.fields.nama_ibu.nilai).toBe("");
  });

  it("memperingatkan bila nama Akta berbeda jauh dengan Langkah 1", () => {
    const h = parseAkta(dariBaris(BARU), "Budi Hartono");
    expect(h.peringatan.join(" ")).toMatch(/berbeda dengan nama di Langkah 1/);
  });

  it("Akta tak terbaca menghasilkan field kosong dan peringatan", () => {
    const h = parseAkta(dariBaris(["gelap"]));
    expect(h.fields.tempat_lahir.keyakinan).toBe("NOT_FOUND");
    expect(h.peringatan.join(" ")).toMatch(/tidak ditemukan/);
  });
});

describe("tempat lahir akta dipotong di batasnya (laporan pemilik, 26 Okt 2026)", () => {
  const tempatDari = (baris: string[]) => parseAkta(dariBaris(baris)).fields.tempat_lahir.nilai;

  it("tulisan hari yang salah baca dan nama hari tidak ikut menjadi tempat lahir", () => {
    expect(tempatDari(["temyata, bahwa di. Bandar Lampung. bhan Senin", "pada tanggal Dua puluh enam Agustus"])).toBe("BANDAR LAMPUNG");
    expect(tempatDari(["ternyata, bahwa di Bandar Lampung, hari Senin"])).toBe("BANDAR LAMPUNG");
    expect(tempatDari(["ternyata, bahwa di Kudus hari Sabtu Wage"])).toBe("KUDUS");
    expect(tempatDari(["bahwa di Kabupaten Banyumas han Selasa"])).toBe("BANYUMAS");
    expect(tempatDari(["bahwa di Kota Bandung Jumat"])).toBe("BANDUNG");
  });

  it("nama tempat dua kata yang sah tetap utuh", () => {
    expect(tempatDari(["bahwa di Bandar Lampung pada tanggal dua puluh"])).toBe("BANDAR LAMPUNG");
    expect(tempatDari(["bahwa di Tanjung Pinang, pada tanggal"])).toBe("TANJUNG PINANG");
  });
});

describe("parseKk: nama wilayah yang menempel pada awalan Kota atau Kabupaten", () => {
  it("KOTADUMAI menjadi KOTA DUMAI; nama tanpa awalan tidak berubah", () => {
    const h = parseKk(sel([["No.1472022612050006", 380, 40], ["Kabupaten/Kota", 20, 80], ["KOTADUMAI", 220, 80], ["Provinsi", 600, 80], ["RIAU", 760, 80]]), "");
    expect(h.fields.kabupaten.nilai).toBe("KOTA DUMAI");
    const s = parseKk(sel([["No.3404080111110002", 380, 40], ["Kabupaten/Kota", 20, 80], ["SLEMAN", 220, 80]]), "");
    expect(s.fields.kabupaten.nilai).toBe("SLEMAN");
  });
});
