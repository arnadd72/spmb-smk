// Olah foto mentah dari .local/aset-mentah ke WebP di public/images/sekolah.
// Foto berasal dari situs sekolah (smkmanu1wangon.sch.id). Jalankan: node scripts/olah-gambar.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const akar = resolve(import.meta.dirname, "..");
const masuk = join(akar, ".local", "aset-mentah");
const keluar = join(akar, "public", "images", "sekolah");
mkdirSync(keluar, { recursive: true });

const daftar = [
  { dari: "osis.jpg", ke: "gedung-siswa.webp", lebar: 1600 },
  { dari: "mplb.png", ke: "praktik-mplb.webp", lebar: 1600 },
  { dari: "tkr.png", ke: "praktik-tkr.webp", lebar: 700 }, // sumber 700 px, tidak diperbesar agar tidak buram
  { dari: "akl.jpeg", ke: "praktik-akl.webp", lebar: 1600 },
  { dari: "fkk-baru.jpg", ke: "praktik-farmasi.webp", lebar: 1200 },
  { dari: "istighotsah.jpg", ke: "istighotsah.webp", lebar: 1280 },
  { dari: "p5-gelar-karya.jpg", ke: "p5-karya.webp", lebar: 1280 },
  { dari: "jumat-bersih.jpg", ke: "p5-kostum.webp", lebar: 700 },
  { dari: "kultum.jpg", ke: "kultum.webp", lebar: 1280 },
  { dari: "mbg.jpg", ke: "kelas-otkp.webp", lebar: 1280 },
];

for (const g of daftar) {
  const gambar = sharp(join(masuk, g.dari));
  if (g.potong) gambar.extract(g.potong);
  const info = await gambar
    .resize({ width: g.lebar, withoutEnlargement: true })
    .webp({ quality: 86 })
    .toFile(join(keluar, g.ke));
  console.log(g.ke, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} KB`);
}

// Logo sekolah (logo.png, latar transparan): buang ruang kosong di sekeliling perisai agar logo penuh di kotaknya.
// Ukuran asli dipertahankan karena dipakai juga sebagai hiasan besar di bagian penutup landing.
const logo = await sharp(join(masuk, "logo.png")).trim().png({ compressionLevel: 9 }).toFile(join(keluar, "logo-sekolah.png"));
console.log("logo-sekolah.png", `${logo.width}x${logo.height}`);
