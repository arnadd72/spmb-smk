"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const JURUSAN = [
  { kode: "MPLB", nama: "Manajemen Perkantoran dan Layanan Bisnis", warna: "bg-mint" },
  { kode: "AKL", nama: "Akuntansi dan Keuangan Lembaga", warna: "bg-primer" },
  { kode: "LPK3", nama: "Farmasi", warna: "bg-jurusan-lpk3" },
  { kode: "TKR", nama: "Teknik Kendaraan Ringan", warna: "bg-jurusan-tkr" },
] as const;

const PERTANYAAN = [
  {
    teks: "Kegiatan apa yang paling kamu sukai ketika berada di sekolah?",
    opsi: [
      "Mengatur dokumen, membuat jadwal, dan membantu kegiatan sekolah.",
      "Menghitung uang, mencatat pemasukan, atau merencanakan kegiatan bisnis.",
      "Mempelajari kesehatan, obat-obatan, dan cara menjaga tubuh.",
      "Mengenal mesin, kendaraan, dan cara memperbaiki sesuatu.",
    ],
  },
  {
    teks: "Jika mendapat tugas kelompok, peran apa yang paling kamu sukai?",
    opsi: [
      "Mengatur pembagian tugas dan memastikan kegiatan berjalan teratur.",
      "Mengatur anggaran, menghitung keuntungan, atau merencanakan usaha kelompok.",
      "Mencari informasi tentang kesehatan dan obat-obatan.",
      "Menyiapkan peralatan dan membantu menyelesaikan masalah teknis.",
    ],
  },
  {
    teks: "Aktivitas mana yang paling menarik bagimu?",
    opsi: [
      "Menata dokumen, menyusun arsip, dan membuat jadwal kegiatan.",
      "Menghitung keuntungan penjualan, mencatat transaksi, atau merencanakan bisnis kecil.",
      "Mempelajari fungsi obat dan mengenal berbagai jenis bahan kesehatan.",
      "Mengamati mesin dan memahami cara kerjanya.",
    ],
  },
  {
    teks: "Ketika melihat seseorang mengalami kesulitan, apa yang paling mungkin kamu lakukan?",
    opsi: [
      "Membantu mengatur kebutuhan dan mencarikan informasi yang diperlukan.",
      "Membantu menghitung kebutuhan biaya atau menyusun anggaran.",
      "Membantu mencari informasi kesehatan yang tepercaya dan menyarankan bantuan tenaga kesehatan.",
      "Membantu memeriksa kerusakan benda atau mencari penyebab masalah teknis.",
    ],
  },
  {
    teks: "Pelajaran atau kegiatan seperti apa yang paling membuatmu penasaran?",
    opsi: [
      "Administrasi, komunikasi, dan pengelolaan kegiatan.",
      "Perhitungan, pengelolaan keuangan, dan strategi bisnis.",
      "IPA, tubuh manusia, dan obat-obatan.",
      "Mesin, otomotif, dan teknologi kendaraan.",
    ],
  },
  {
    teks: "Jika diberi tugas yang membutuhkan ketelitian, kamu lebih suka ...",
    opsi: [
      "Memeriksa kelengkapan dokumen dan memastikan susunannya rapi.",
      "Memeriksa angka, mencatat transaksi, dan memastikan perhitungan benar.",
      "Memeriksa informasi dan aturan penggunaan obat dengan cermat.",
      "Memeriksa komponen kendaraan dan memastikan setiap bagian terpasang dengan benar.",
    ],
  },
  {
    teks: "Kamu ingin memulai usaha kecil-kecilan. Apa yang paling ingin kamu lakukan?",
    opsi: [
      "Mengatur jadwal kegiatan dan menyusun dokumen usaha.",
      "Menentukan harga jual, menghitung modal dan keuntungan, serta merencanakan strategi penjualan.",
      "Mempelajari produk kesehatan dan memastikan informasi produknya benar.",
      "Memahami kebutuhan peralatan dan perawatan kendaraan untuk usaha bengkel.",
    ],
  },
  {
    teks: "Saat menghadapi masalah yang belum pernah kamu temui, apa yang biasanya kamu lakukan?",
    opsi: [
      "Menyusun langkah penyelesaian agar masalah lebih mudah diatur.",
      "Mengumpulkan data, menghitung kemungkinan, dan mempertimbangkan solusi bisnis atau keuangan.",
      "Mencari informasi tepercaya sebelum mengambil keputusan.",
      "Memeriksa penyebab masalah dan mencoba memahami cara kerjanya.",
    ],
  },
  {
    teks: "Lingkungan belajar seperti apa yang paling kamu sukai?",
    opsi: [
      "Ruang kerja yang rapi, terorganisasi, dan mendukung komunikasi.",
      "Tempat yang menyediakan kegiatan pencatatan keuangan, pengolahan data, atau simulasi bisnis.",
      "Laboratorium yang bersih dengan peralatan dan bahan untuk pembelajaran kefarmasian.",
      "Bengkel yang memiliki kendaraan, mesin, dan peralatan praktik.",
    ],
  },
  {
    teks: "Jika menemukan kesalahan dalam sebuah pekerjaan, apa yang paling mungkin kamu lakukan?",
    opsi: [
      "Memeriksa kembali urutan pekerjaan dan memperbaiki bagian yang tidak teratur.",
      "Menghitung ulang, memeriksa catatan transaksi, dan mencari penyebab kesalahan.",
      "Memeriksa kembali informasi dan prosedur untuk memastikan semuanya benar.",
      "Memeriksa bagian yang bermasalah dan mencari penyebab kerusakannya.",
    ],
  },
  {
    teks: "Keterampilan apa yang paling ingin kamu kuasai?",
    opsi: [
      "Berkomunikasi secara profesional, mengelola dokumen, dan mengatur pekerjaan.",
      "Membuat laporan keuangan, mencatat transaksi, menghitung keuntungan, dan mengelola bisnis.",
      "Mengenal obat-obatan dan memahami prosedur pelayanan kefarmasian.",
      "Merawat kendaraan dan memahami sistem mesin otomotif.",
    ],
  },
  {
    teks: "Jika sekolah mengadakan kunjungan belajar, tempat mana yang paling ingin kamu kunjungi?",
    opsi: [
      "Kantor perusahaan atau pusat administrasi.",
      "Perusahaan akuntansi, bagian keuangan perusahaan, atau tempat usaha yang mengelola bisnis.",
      "Apotek atau fasilitas pelayanan kefarmasian.",
      "Bengkel mobil atau pusat perawatan kendaraan.",
    ],
  },
  {
    teks: "Ketika mendapatkan banyak tugas dengan batas waktu yang berbeda, apa yang akan kamu lakukan?",
    opsi: [
      "Membuat jadwal dan daftar tugas berdasarkan prioritas.",
      "Menghitung anggaran atau waktu yang tersedia, memeriksa kebutuhan, dan menentukan prioritas.",
      "Memastikan tugas yang berhubungan dengan kesehatan dan keselamatan dikerjakan sesuai prosedur.",
      "Menentukan urutan pekerjaan berdasarkan masalah teknis yang harus diselesaikan.",
    ],
  },
  {
    teks: "Jika diminta membuat sebuah proyek sederhana, proyek apa yang paling menarik bagimu?",
    opsi: [
      "Membuat sistem pengarsipan atau jadwal kegiatan kelas.",
      "Membuat rencana bisnis sederhana beserta modal, harga jual, dan perkiraan keuntungan.",
      "Membuat media edukasi tentang penggunaan obat secara aman.",
      "Membuat proyek pengenalan komponen dan perawatan kendaraan.",
    ],
  },
  {
    teks: "Setelah lulus SMK, bidang pekerjaan apa yang paling ingin kamu coba?",
    opsi: [
      "Administrasi perkantoran, sekretaris, atau pengelolaan layanan kantor.",
      "Akuntansi, pembukuan, keuangan, administrasi bisnis, atau menjalankan usaha sendiri.",
      "Bidang kefarmasian sesuai kualifikasi dan ketentuan yang berlaku.",
      "Teknisi otomotif atau mekanik kendaraan ringan.",
    ],
  },
] as const;

const HURUF = ["A", "B", "C", "D"] as const;

export function TesMinatBakat() {
  const [langkah, setLangkah] = useState(0);
  const [jawaban, setJawaban] = useState<(number | null)[]>(() => Array(PERTANYAAN.length).fill(null));
  const [lihatHasil, setLihatHasil] = useState(false);
  const skor = JURUSAN.map((jurusan, indeks) => ({ ...jurusan, poin: jawaban.filter((x) => x === indeks).length })).sort((a, b) => b.poin - a.poin);
  const tertinggi = skor[0].poin;
  const jumlahTertinggi = skor.filter((x) => x.poin === tertinggi).length;

  function jawab(indeks: number) {
    setJawaban((sebelumnya) => sebelumnya.map((nilai, i) => (i === langkah ? indeks : nilai)));
  }

  function lanjut() {
    if (jawaban[langkah] === null) return;
    if (langkah === PERTANYAAN.length - 1) setLihatHasil(true);
    else setLangkah((sebelumnya) => sebelumnya + 1);
  }

  function ulangi() {
    setJawaban(Array(PERTANYAAN.length).fill(null));
    setLangkah(0);
    setLihatHasil(false);
  }

  return (
        <div id="tes-minat-bakat" className="rounded-kartu bg-permukaan p-5 text-ink shadow-kartu sm:p-8">
          {lihatHasil ? (
            <div aria-live="polite">
              <h3 className="text-xl font-bold text-ink">Hasil minatmu</h3>
              <p className="mt-2 text-sm text-tinta-redup">Poin dihitung dari jawabanmu. Nilai seri ditampilkan sebagai rekomendasi setara.</p>
              <ol className="mt-6 flex flex-col gap-5">
                {skor.map((jurusan) => {
                  const utama = jurusan.poin === tertinggi;
                  return (
                    <li key={jurusan.kode}>
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-xl font-bold">{jurusan.kode}</p>
                          <p className="text-sm text-tinta-redup">{jurusan.nama}</p>
                        </div>
                        <p className="angka shrink-0 font-bold">{jurusan.poin} poin</p>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-permukaan-alt">
                        <div className={cn("h-full rounded-full", jurusan.warna)} style={{ width: `${(jurusan.poin / PERTANYAAN.length) * 100}%` }} />
                      </div>
                      <p className={cn("mt-1 text-sm font-semibold", utama ? "text-primer-tua" : "text-tinta-redup")}>
                        {utama ? (jumlahTertinggi > 1 ? "Rekomendasi setara" : "Minat paling banyak") : "Alternatif"}
                      </p>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-6 flex flex-wrap gap-3 border-t border-garis pt-5">
                <Button type="button" varian="sekunder" onClick={() => setLihatHasil(false)}>
                  Ubah jawaban
                </Button>
                <Button type="button" onClick={ulangi}>
                  Ulangi tes
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-tinta">Pertanyaan {langkah + 1} dari {PERTANYAAN.length}</p>
                <p className="text-sm text-tinta-redup">{Math.round(((langkah + 1) / PERTANYAAN.length) * 100)}%</p>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-permukaan-alt"
                role="progressbar"
                aria-label="Kemajuan tes"
                aria-valuemin={0}
                aria-valuemax={PERTANYAAN.length}
                aria-valuenow={langkah + 1}
              >
                <div className="h-full rounded-full bg-primer transition-[width]" style={{ width: `${((langkah + 1) / PERTANYAAN.length) * 100}%` }} />
              </div>
              <fieldset className="mt-6">
                <legend className="text-lg font-bold leading-snug text-ink sm:text-xl">{PERTANYAAN[langkah].teks}</legend>
                <div className="mt-4 flex flex-col gap-2">
                  {PERTANYAAN[langkah].opsi.map((opsi, indeks) => (
                    <label
                      key={opsi}
                      className={cn(
                        "flex min-h-12 cursor-pointer items-start gap-3 rounded-kontrol border px-3 py-3 text-sm transition-colors",
                        jawaban[langkah] === indeks ? "border-primer bg-mint/50" : "border-garis bg-permukaan hover:bg-permukaan-alt",
                      )}
                    >
                      <input
                        type="radio"
                        name={`pertanyaan-${langkah}`}
                        value={indeks}
                        checked={jawaban[langkah] === indeks}
                        onChange={() => jawab(indeks)}
                        className="mt-0.5 size-4 shrink-0 accent-primer"
                      />
                      <span>
                        <span className="mr-1.5 font-bold">{HURUF[indeks]}.</span>
                        {opsi}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-garis pt-5">
                <Button type="button" varian="sekunder" onClick={() => setLangkah((sebelumnya) => Math.max(0, sebelumnya - 1))} disabled={langkah === 0}>
                  Sebelumnya
                </Button>
                <Button type="button" onClick={lanjut} disabled={jawaban[langkah] === null}>
                  {langkah === PERTANYAAN.length - 1 ? "Lihat hasil" : "Lanjut"}
                </Button>
              </div>
            </>
          )}
        </div>
  );
}
