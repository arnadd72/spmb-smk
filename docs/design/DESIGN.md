# Design system SPMB

Acuan: `docs/PRD.md` Bagian 16 dan keputusan di Bagian 1.3 (butir 17-19, 22-23, 38). Bila dokumen ini bertentangan dengan PRD, PRD yang menang.
Arah visual: hijau sebagai warna dominan (gelap, primer, muda) di atas krem netral; foto warna asli; satu keluarga font. Keterbacaan mengalahkan efek.

> Pembaruan 12 Okt 2026 (permintaan pemilik proyek, PRD 1.3 butir 38): palet "Daun Zaitun" menggantikan palet hijau NU + kuning + jingga + mint, dan Poppins menggantikan Clash Display + Satoshi. Isi dokumen ini sudah mengikuti keputusan tersebut.

Katalog hidup: `/admin/_katalog` (hanya di lingkungan lokal, 404 di produksi). Swatch di katalog masih memakai hex lama (lihat "Belum selaras").
Tangkapan layar: `docs/design/katalog-*.png` dan `docs/design/landing-*.png` (dibuat ulang oleh e2e dengan palet baru, 12 Okt 2026).

## Token warna

Semua token ada di `src/styles/globals.css` (tiga lapis: nilai mentah, token semantik, `@theme inline`). Komponen memakai nama utilitas, tidak memakai hex.

Palet inti empat warna:

| Peran | Hex | Token yang memakainya |
|---|---|---|
| Hijau gelap | `#123524` | `ink`, `tinta`, `aksen-tinta` |
| Hijau primer | `#387324` | `primer` (`hijau-nu`) |
| Hijau muda | `#85A947` | `kuning`, `aksen`, `jingga`, `emas` (nama lama dipertahankan agar komponen tidak berubah) |
| Krem netral | `#F2EFE6` | `kertas`, `latar` |

Turunan:

| Token (utilitas) | Nilai | Fungsi |
|---|---|---|
| `permukaan` | `#F9F7F1` | Kartu, input, bagian galeri dan testimoni |
| `permukaan-alt` / `kertas-garis` | `#E5E0D2` | Garis halus, hover, skeleton |
| `garis` | `#D6D0BF` | Border |
| `tinta-redup` | `#4B5B3A` | Teks bantuan |
| `primer-tua` (`hijau-tua`) | `#2C5A1C` | Hover tombol utama, judul di atas terang |
| `hijau-gelap` | `#0D271B` | Footer, latar paling pekat |
| `hijau-hutan` | `#1B4630` | Latar bagian pernyataan ("Di bawah naungan LP Ma'arif NU...") |
| `mint` | `#C5D89D` | Latar bagian saran jurusan, marquee jurusan, panel MPLB, sorotan teks di latar gelap |
| `hijau-terang` | `#A3C960` | Sorotan teks di latar `hijau-hutan` |
| `primer-tinta` | `#FFFFFF` | Teks di atas tombol utama |
| `fokus` | `#0B5FB3` | Cincin fokus keyboard |
| `sukses`, `info`, `peringatan`, `bahaya` (+ `-latar`) | lihat CSS | Status, kontras AA di atas krem |

Pasangan warna di tiap bagian landing:

| Bagian | Latar | Teks / sorotan |
|---|---|---|
| Hero, alur daftar, FAQ | `latar` (krem) | `ink` |
| Marquee jurusan | `mint` | `ink` |
| Pernyataan | `hijau-hutan` | `kertas`; sorotan "empat program keahlian" `hijau-terang`, "akhlak" `mint` |
| Saran jurusan | `mint` | `ink` |
| Kehidupan sekolah, testimoni | `permukaan` | `ink` |
| Penutup | `ink` | `kertas` |
| Panel jurusan | AKL `kuning`, MPLB `mint`, FKK `primer`, TKR `ink` | Kode jurusan: AKL/MPLB `ink`, FKK/TKR `kertas` |

Tema gelap disiapkan lewat atribut `data-tema="gelap"` untuk situs publik (nilainya belum disesuaikan dengan palet baru). Wizard dan admin tetap terang.

### Kontras (WCAG 2.1 AA, diukur 12 Okt 2026)

- Teks `ink` di atas krem: 11,70. Teks krem di atas `ink`: 11,70.
- Teks putih di atas `primer` (tombol utama): 5,76. Teks krem di atas `primer` (panel FKK, kartu alur): 5,01. Teks `primer` di atas krem: 5,01.
- Teks `ink` di atas `kuning`/`aksen`: 4,98. Di atas `mint`: 8,77.
- Di bagian pernyataan (`hijau-hutan`): krem 9,29, `hijau-terang` 5,64, `mint` 6,96.
- **Teks yang diredupkan animasi ikut dihitung axe.** Kata di bagian pernyataan mulai dari opacity 0,65 (bukan 0,5) dan tahap redup di panel cek status 0,7 (bukan 0,55), agar tetap lolos AA di latar hijau yang lebih terang dari tinta lama. Jangan menurunkannya lagi tanpa menghitung ulang.
- Tombol `primer` di atas latar `ink` (bagian penutup) hanya 2,6:1 sebagai bentuk; teksnya tetap terbaca.

## Tipografi

- Satu keluarga: **Poppins** 400/500/600/700 lewat `next/font/google` di `src/app/layout.tsx` (variabel `--font-poppins`; berkas font di-host sendiri saat build, browser tidak menghubungi Google). `font-display` dan `font-sans` sama-sama memakai Poppins. Berkas Clash Display dan Satoshi di `src/app/fonts/` tidak dipakai lagi.
- Isi: dasar 16 px, tinggi baris 1,5.
- Judul: jarak huruf rapat ringan (-0,01 sampai -0,03 em). Poppins punya ekor huruf panjang (j, p, g): **tinggi baris judul minimal 1,15** untuk judul dua baris atau lebih (judul hero sudah 1,15). Beberapa judul lain masih memakai 0,96-1 dari font lama; longgarkan bila barisnya menabrak.
- Angka di tabel, skor, dan statistik memakai `tabular-nums` (kelas `angka` atau tag `table`).
- Dilarang menambah keluarga font kedua.

## Bentuk

- Radius: `rounded-kontrol` 6 px (input, tombol, lencana kotak), `rounded-kartu` 14 px, `rounded-full` untuk pil.
- Satu bayangan tipis (`shadow-kartu`). Tanpa tumpukan bayangan.
- Ikon: hanya `@phosphor-icons/react` (nama berakhiran `Icon`), bobot regular untuk UI, duotone hanya untuk ilustrasi bagian.

## Komponen (`src/components`)

- `ui/`: Button, Field, Input, Textarea, Select, FileDrop, Badge (BadgeStatus, BadgeKeyakinan), Card, Dialog, Stepper, EmptyState, Skeleton.
- `layout/`: Navbar, Footer, AdminShell. Layout route: `(publik)`, `(daftar)`, `(admin)`.
- `motion/`: Reveal, StaggerList, PageTransition (Motion), `use-gsap.ts` (GSAP, hanya route publik).

### Tombol (`ui/button.tsx`)

| Varian | Tampilan | Dipakai untuk |
|---|---|---|
| `utama` (bawaan) | Latar `primer`, teks putih, hover `primer-tua` | Semua "Daftar Sekarang" (navbar, hero, penutup, detail jurusan) |
| `aksen` | Latar `aksen` (hijau muda), teks `ink` | Tombol mulai dan kirim di wizard |
| `bingkai` | Garis 2 px `ink`, transparan; terisi `ink` + teks krem saat hover, klik, atau fokus keyboard (juga bila `Link` pembungkusnya yang fokus) | "Cek Status" di hero |
| `terang` | Garis krem di atas latar gelap | "Cek Status" di penutup |
| `sekunder`, `gelap`, `hantu`, `bahaya` | lihat berkas | Aksi sekunder, admin |

Aturan:
- Satu label per maksud: "Daftar Sekarang" dan "Cek Status" (PRD 1.3 butir 17). CTA utama kini hijau, bukan kuning.
- Target sentuh minimal 44 px. Fokus terlihat (3 px). Kontras WCAG AA.
- Tombol utama penuh lebar di mobile (`penuhMobile`).
- Status selalu ikon dan teks, tidak hanya warna.
- Label di atas input, bantuan di bawah, galat dekat field (`aria-describedby`, `role="alert"`).
- Kartu hanya bila elevasi memberi hierarki.

## Tata letak

- Lebar konten publik: kelas `.wadah` dan `.sejajar-wadah` di `globals.css` (PRD 1.3 butir 22).
- Galeri "Belajar, berkarya, dan beribadah bersama" (`features/landing/kehidupan-sekolah.tsx`), layar >= 1024 px: dua baris berpasangan 7/5 lalu 5/7 kolom dengan tepi sejajar, lalu satu foto selebar penuh. Di tiap baris, foto berasio tetap menentukan tinggi baris dan pasangannya (`lg:flex-1`) mengisi tinggi yang sama. Di HP satu kolom. Foto galeri admin (minimal tiga) mengisi slot yang sama.

## Foto

- Warna asli, tanpa filter, duotone, atau overlay (PRD 1.3 butir 19). Foto kecil tidak diperbesar melebihi ukuran aslinya.
- Sumber mentah di `.local/aset-mentah` (tidak di-commit), diolah ke `public/images/sekolah` oleh `scripts/olah-gambar.mjs` (WebP kualitas 86; opsi `potong` untuk memotong bagian tertentu).
- Foto jurusan: AKL `praktik-akl.webp`, MPLB `praktik-mplb.webp`, FKK `praktik-farmasi.webp`, TKR `praktik-tkr.webp`. AKL dan FKK kiriman pihak sekolah, MPLB dan TKR dari situs sekolah. Data foto ada di `TAMPIL` (`features/landing/program-keahlian.tsx`) dan `TAMPIL_JURUSAN` (`features/jurusan/tampil.ts`); keduanya harus diubah bersama.
- Bingkai foto panel jurusan hampir kotak sementara fotonya lebar. Titik fokus diatur dengan kolom opsional `posisi` (kelas `object-[x%_y%]`): FKK `0% 50%` (siswi kiri yang meracik), TKR `18% 50%` (guru dan siswa di roda).
- Bila foto diganti dengan isi berbeda, pakai **nama berkas baru**: `next/image` menyimpan cache hasil optimasi berdasarkan alamat, sehingga nama lama bisa menampilkan foto lama.
- Logo: `logo-sekolah.png` (dari `logo.png`, latar transparan, ruang kosong dipotong). Dipakai di navbar, hero, tirai pembuka, dan hiasan latar penutup.

## Motion

- Motion (`motion/react`) untuk UI: transisi langkah wizard (250 ms), reveal (350 ms), stagger, micro-interaction.
- GSAP hanya di route publik dan dimuat dinamis. Tidak ada GSAP di wizard dan admin.
- Hanya animasikan `transform` dan `opacity`. Semua animasi statis bila `prefers-reduced-motion`.
- Dial intensitas: landing 9/10 (PRD 1.3 butir 19), detail dan berita 4/10, wizard 2/10, admin 1/10.
- **Topeng SplitText:** setiap `SplitText.create` dengan `mask` wajib memberi `linesClass: "baris"` (mask lines) atau `wordsClass: "kata"` (mask words). `globals.css` memperluas area potong `.baris-mask` dan `.kata-mask` 0,14em ke bawah supaya ekor huruf tidak terpotong, tanpa mengubah jarak baris. Jangan memakai selektor atribut `[style*=...]` untuk ini: aturan seperti itu hilang di CSS hasil Turbopack.

## Larangan (PRD 16.4)

Gradien ungu/biru/pink, latar mesh, glassmorphism massal, hero tengah template, grid tiga kartu identik untuk semua konten, emoji sebagai ikon, Inter/Roboto tanpa alasan, label meta palsu, em-dash dekoratif, statistik palsu, kalimat generik, tampilan default shadcn/ui, bayangan berat bertumpuk, animasi yang memperlambat tugas.

## Belum selaras dengan palet baru

- Email kode pendaftaran (`src/server/email/kodePendaftaran.ts`) masih memakai hex hijau NU lama.
- `themeColor` di `src/app/layout.tsx` masih `#057a3c`.
- Swatch warna di `/admin/_katalog` (`katalog.tsx`) masih menampilkan hex lama.
- Nilai tema gelap (`data-tema="gelap"`) belum disesuaikan.
- `favicon.ico` belum memakai logo baru.

## Verifikasi

`tests/e2e/katalog.spec.ts` memeriksa katalog di 360 dan 1440 px: tanpa gulir horizontal, nol pelanggaran axe WCAG 2.1 AA, dan menghasilkan tangkapan layar ke `docs/design/`.
