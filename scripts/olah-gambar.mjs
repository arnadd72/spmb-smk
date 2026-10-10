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
  { dari: "istighotsah.jpg", ke: "istighotsah.webp", lebar: 1280 },
  { dari: "p5-gelar-karya.jpg", ke: "p5-karya.webp", lebar: 1280 },
  { dari: "jumat-bersih.jpg", ke: "p5-kostum.webp", lebar: 700 },
  { dari: "kultum.jpg", ke: "kultum.webp", lebar: 1280 },
  { dari: "mbg.jpg", ke: "kelas-otkp.webp", lebar: 1280 },
];

for (const g of daftar) {
  const info = await sharp(join(masuk, g.dari))
    .resize({ width: g.lebar, withoutEnlargement: true })
    .webp({ quality: 86 })
    .toFile(join(keluar, g.ke));
  console.log(g.ke, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} KB`);
}

// Lambang: potong bagian kiri logo header (836x125) lalu buang latar putih yang terhubung ke tepi
// (flood fill), agar isi lambang yang kebetulan putih tetap utuh.
const { data, info } = await sharp(join(masuk, "logo-header.png"))
  .extract({ left: 0, top: 0, width: 126, height: 125 })
  .resize({ width: 252 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const putih = (i) => data[i] > 232 && data[i + 1] > 232 && data[i + 2] > 232;
const sudah = new Uint8Array(w * h);
const antrean = [];
for (let x = 0; x < w; x++) antrean.push(x, (h - 1) * w + x);
for (let y = 0; y < h; y++) antrean.push(y * w, y * w + w - 1);
while (antrean.length) {
  const p = antrean.pop();
  if (sudah[p] || !putih(p * 4)) continue;
  sudah[p] = 1;
  data[p * 4 + 3] = 0;
  const x = p % w;
  if (x > 0) antrean.push(p - 1);
  if (x < w - 1) antrean.push(p + 1);
  if (p >= w) antrean.push(p - w);
  if (p < w * (h - 1)) antrean.push(p + w);
}
await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(join(keluar, "lambang.png"));
console.log("lambang.png ok (latar transparan)");
