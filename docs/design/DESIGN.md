# Design system SPMB (hasil M1)

Acuan: `docs/PRD.md` Bagian 16. Bila dokumen ini bertentangan dengan PRD, PRD yang menang.
Arah visual: warna sekolah (hijau dan kuning) dengan tinta pekat, mint, dan jingga sebagai penyeimbang; foto warna asli; tipografi tegas. Keterbacaan mengalahkan efek.

> Pembaruan 11 Okt 2026 (permintaan pemilik proyek, dicatat di PRD 1.3 butir 19): font diganti ke Clash Display dan Satoshi, duotone hijau pada foto dihapus, palet diperluas, motion landing dinaikkan. Bagian di bawah yang masih menyebut Bricolage, Plus Jakarta Sans, emas, atau duotone sudah tidak berlaku untuk situs publik.

Katalog hidup: `/admin/_katalog` (hanya di lingkungan lokal, 404 di produksi).
Tangkapan layar: `docs/design/katalog-360.png` dan `docs/design/katalog-1440.png`.

## Token

Semua token ada di `frontend/src/styles/globals.css`. Komponen memakai nama token, tidak memakai hex.

| Token (utilitas) | Nilai terang | Fungsi |
|---|---|---|
| `latar` | `#F6F3EC` | Latar halaman |
| `permukaan` | `#FFFDF8` | Kartu, input |
| `permukaan-alt` | `#E9E4D8` | Garis halus, hover, skeleton |
| `garis` | `#D8D1BF` | Border |
| `tinta` / `tinta-redup` | `#16201A` / `#4A5A50` | Teks utama / bantuan |
| `primer` / `primer-tua` | `#057A3C` / `#03452A` | Tombol utama, judul |
| `hijau-gelap` | `#0E1F17` | Footer, latar gelap |
| `aksen` / `kuning` | `#F4B400` | Kuning sekolah: tombol utama dan sorotan |
| `ink` | `#0E1512` | Tinta pekat: judul, latar bagian gelap, footer |
| `mint` | `#9AE0CC` | Latar bagian saran jurusan, aksen sejuk |
| `jingga` | `#FF6B35` | Penyeimbang hangat (kartu alur) |
| `sukses`, `info`, `peringatan`, `bahaya` (+ `-latar`) | lihat CSS | Status, kontras AA di atas kertas |

Tema gelap disiapkan lewat atribut `data-tema="gelap"` untuk situs publik. Wizard dan admin tetap terang.

## Tipografi

- Display: Clash Display 500/600/700 (`font-display`). Judul, kode jurusan, angka besar. Jarak huruf rapat ringan (-0,01 sampai -0,03 em) dan jarak kata dilonggarkan (0,08 em); jangan lebih rapat dari itu.
- Isi: Satoshi 400/500/700 (`font-sans`). Dasar 16 px, tinggi baris 1,5.
- Angka di tabel, skor, dan statistik memakai `tabular-nums` (kelas `angka` atau tag `table`).
- Dilarang menambah keluarga font ketiga.

## Bentuk

- Radius: `rounded-kontrol` 6 px (input, tombol, lencana kotak), `rounded-kartu` 14 px, `rounded-full` untuk pil.
- Satu bayangan tipis (`shadow-kartu`). Tanpa tumpukan bayangan.
- Ikon: hanya `@phosphor-icons/react` (nama berakhiran `Icon`), bobot regular untuk UI, duotone hanya untuk ilustrasi section.

## Komponen (`frontend/src/components`)

- `ui/`: Button, Field, Input, Textarea, Select, FileDrop, Badge (BadgeStatus, BadgeKeyakinan), Card, Dialog, Stepper, EmptyState, Skeleton.
- `layout/`: Navbar, Footer, AdminShell. Layout route: `(publik)`, `(daftar)`, `(admin)`.
- `motion/`: Reveal, StaggerList, PageTransition (Motion), `use-gsap.ts` (GSAP, hanya route publik).

Aturan:
- Target sentuh minimal 44 px. Fokus terlihat (3 px). Kontras WCAG AA.
- Tombol utama penuh lebar di mobile (`penuhMobile`).
- Emas (`aksen`) hanya satu per layar.
- Status selalu ikon dan teks, tidak hanya warna.
- Label di atas input, bantuan di bawah, galat dekat field (`aria-describedby`, `role="alert"`).
- Kartu hanya bila elevasi memberi hierarki.

## Motion

- Motion (`motion/react`) untuk UI: transisi langkah wizard (250 ms), reveal (350 ms), stagger, micro-interaction.
- GSAP hanya di route publik dan dimuat dinamis. Tidak ada GSAP di wizard dan admin.
- Hanya animasikan `transform` dan `opacity`. Semua animasi statis bila `prefers-reduced-motion`.
- Dial intensitas: landing 6/10, detail dan berita 4/10, wizard 2/10, admin 1/10.

## Larangan (PRD 16.4)

Gradien ungu/biru/pink, latar mesh, glassmorphism massal, hero tengah template, grid tiga kartu identik untuk semua konten, emoji sebagai ikon, Inter/Roboto tanpa alasan, label meta palsu, em-dash dekoratif, statistik palsu, kalimat generik, tampilan default shadcn/ui, bayangan berat bertumpuk, animasi yang memperlambat tugas.

## Verifikasi M1

`frontend/tests/e2e/katalog.spec.ts` memeriksa katalog di 360 dan 1440 px: tanpa gulir horizontal, nol pelanggaran axe WCAG 2.1 AA, dan menghasilkan tangkapan layar.
