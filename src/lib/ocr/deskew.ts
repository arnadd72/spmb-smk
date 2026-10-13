// Estimasi kemiringan teks (PRD v4 11.2). Foto dokumen dari HP sering miring beberapa derajat, dan itu cukup merusak
// hasil baca (uji spike: miring 2 derajat membuat tabel rapor tak terbaca). Metode: proyeksi piksel gelap ke sumbu Y
// pada beberapa sudut; sudut yang membuat baris teks paling "tajam" (jumlah kuadrat histogram terbesar) adalah sudutnya.
// Murni (tanpa DOM) supaya bisa diuji; pemanggilnya yang mengubah gambar menjadi array abu-abu.

/** Ambang Otsu untuk memisahkan teks gelap dari latar. */
function ambangOtsu(abu: ArrayLike<number>): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < abu.length; i++) hist[abu[i] | 0]++;
  const total = abu.length;
  let jumlah = 0;
  for (let t = 0; t < 256; t++) jumlah += t * hist[t];
  let jumlahB = 0;
  let wB = 0;
  let terbaik = 0;
  let ambang = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    jumlahB += t * hist[t];
    const mB = jumlahB / wB;
    const mF = (jumlah - jumlahB) / wF;
    const antarKelas = wB * wF * (mB - mF) * (mB - mF);
    if (antarKelas > terbaik) {
      terbaik = antarKelas;
      ambang = t;
    }
  }
  return ambang;
}

/**
 * Sudut kemiringan dalam derajat. Positif berarti baris teks menurun ke kanan (searah jarum jam);
 * untuk meluruskan, putar gambar sebesar -sudut. Mengembalikan 0 bila gambar nyaris kosong.
 */
export function perkirakanSudut(abu: ArrayLike<number>, lebar: number, tinggi: number, batas = 8): number {
  if (abu.length < lebar * tinggi || lebar < 20 || tinggi < 20) return 0;
  const ambang = ambangOtsu(abu);
  const xs: number[] = [];
  const ys: number[] = [];
  const langkah = Math.max(1, Math.floor(Math.sqrt((lebar * tinggi) / 40000)));
  for (let y = 0; y < tinggi; y += 1) {
    for (let x = 0; x < lebar; x += langkah) {
      if (abu[y * lebar + x] <= ambang) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  if (xs.length < 200) return 0;

  const diagonal = Math.ceil(Math.hypot(lebar, tinggi));
  const nilai = (derajat: number) => {
    const rad = (derajat * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const bin = new Float64Array(diagonal * 2 + 2);
    for (let i = 0; i < xs.length; i++) bin[Math.round(ys[i] * c - xs[i] * s) + diagonal]++;
    let skor = 0;
    for (let i = 0; i < bin.length; i++) skor += bin[i] * bin[i];
    return skor;
  };

  let terbaik = 0;
  let skorTerbaik = nilai(0);
  for (let d = -batas; d <= batas; d += 0.5) {
    const sk = nilai(d);
    if (sk > skorTerbaik) {
      skorTerbaik = sk;
      terbaik = d;
    }
  }
  let halus = terbaik;
  for (let d = terbaik - 0.5; d <= terbaik + 0.5; d += 0.1) {
    const sk = nilai(d);
    if (sk > skorTerbaik) {
      skorTerbaik = sk;
      halus = d;
    }
  }
  return Math.round(halus * 10) / 10;
}
