import type { FieldOcr, Keyakinan } from "./tipe";

// Validasi NIK dan Nomor KK dari isinya sendiri (Permendagri tentang NIK): 2 digit provinsi, 2 kabupaten, 2 kecamatan,
// lalu DDMMYY. Pada NIK, DD adalah tanggal lahir (+40 untuk perempuan); pada Nomor KK, DDMMYY adalah tanggal terbit.
// Karena tanggal lahir anggota juga tercetak di kolom lain, NIK yang salah baca satu-dua digit bisa dideteksi dan
// diperbaiki dari dua pembacaan yang saling bebas. Selebihnya dikosongkan: tidak menebak.

/** Kode provinsi yang dipakai pada NIK dan Nomor KK. */
export const PROVINSI: Record<string, string> = {
  "11": "ACEH", "12": "SUMATERA UTARA", "13": "SUMATERA BARAT", "14": "RIAU", "15": "JAMBI", "16": "SUMATERA SELATAN",
  "17": "BENGKULU", "18": "LAMPUNG", "19": "KEPULAUAN BANGKA BELITUNG", "21": "KEPULAUAN RIAU", "31": "DKI JAKARTA",
  "32": "JAWA BARAT", "33": "JAWA TENGAH", "34": "DAERAH ISTIMEWA YOGYAKARTA", "35": "JAWA TIMUR", "36": "BANTEN",
  "51": "BALI", "52": "NUSA TENGGARA BARAT", "53": "NUSA TENGGARA TIMUR", "61": "KALIMANTAN BARAT", "62": "KALIMANTAN TENGAH",
  "63": "KALIMANTAN SELATAN", "64": "KALIMANTAN TIMUR", "65": "KALIMANTAN UTARA", "71": "SULAWESI UTARA", "72": "SULAWESI TENGAH",
  "73": "SULAWESI SELATAN", "74": "SULAWESI TENGGARA", "75": "GORONTALO", "76": "SULAWESI BARAT", "81": "MALUKU",
  "82": "MALUKU UTARA", "91": "PAPUA", "92": "PAPUA BARAT", "93": "PAPUA SELATAN", "94": "PAPUA TENGAH", "95": "PAPUA PEGUNUNGAN",
  "96": "PAPUA BARAT DAYA",
};

/** Pasangan digit yang sering tertukar pada hasil baca. */
const MIRIP = new Set(["01", "10", "17", "71", "35", "53", "56", "65", "58", "85", "68", "86", "38", "83", "08", "80", "09", "90", "69", "96", "27", "72", "49", "94", "06", "60"]);

const dua = (n: number) => String(n).padStart(2, "0");
const beda = (a: string, b: string) => [...a].filter((c, i) => c !== b[i]).length;

function tanggalSah(h: number, b: number): boolean {
  return h >= 1 && h <= 31 && b >= 1 && b <= 12;
}

/** Nomor KK: 16 digit, kode provinsi dikenal, dan DDMMYY tanggal terbit yang sah. */
export function periksaNoKk(no: string): FieldOcr {
  if (!/^\d{16}$/.test(no) || !PROVINSI[no.slice(0, 2)]) return { nilai: "", keyakinan: "LOW" };
  if (!tanggalSah(Number(no.slice(6, 8)), Number(no.slice(8, 10)))) return { nilai: "", keyakinan: "LOW" };
  return { nilai: no, keyakinan: "HIGH" };
}

/** Bagian DDMMYY yang seharusnya ada di NIK untuk tanggal lahir dan jenis kelamin itu. */
function ddmmyy(tanggal: string, perempuan: boolean): string {
  const [t, b, h] = tanggal.split("-").map(Number);
  return `${dua(h + (perempuan ? 40 : 0))}${dua(b)}${dua(t % 100)}`;
}

/**
 * Periksa NIK terhadap tanggal lahir dan jenis kelamin yang terbaca di baris yang sama, dan terhadap wilayah Nomor KK.
 * NIK dan kolom tanggal adalah dua pembacaan yang saling bebas; bila berbeda, hanya diperbaiki bila jelas mana yang
 * salah baca (digit NIK berasal dari huruf yang dikoreksi, sementara tanggalnya bersih). Selain itu tidak menebak.
 * - cocok: HIGH
 * - digit tanggal pada NIK berasal dari koreksi huruf dan tanggal bersih: diperbaiki, MEDIUM
 * - tanggal pembanding meragukan (berhuruf atau dari baris sebelah): tidak dipakai, NIK dinilai dari strukturnya, MEDIUM
 * - kode wilayah beda 1-2 digit dari Nomor KK dan semuanya pasangan digit yang mudah tertukar: diperbaiki, MEDIUM
 * - kode wilayah beda 1-2 digit selain itu: mencurigakan, kosong
 * - selain itu: kosong (LOW)
 */
export function periksaNik(
  nik: string,
  opsi: { tanggal?: string | null; jk?: "L" | "P" | ""; wilayahKk?: string; tanggalRagu?: boolean; posisiKoreksi?: number[] } = {},
): FieldOcr {
  if (!/^\d{16}$/.test(nik) || !PROVINSI[nik.slice(0, 2)]) return { nilai: "", keyakinan: "LOW" };
  let nilai = nik;
  let keyakinan: Keyakinan = "HIGH";

  const w = opsi.wilayahKk;
  if (w && /^\d{6}$/.test(w) && nilai.slice(0, 6) !== w) {
    const posisi = [...nilai.slice(0, 6)].map((c, k) => (c !== w[k] ? k : -1)).filter((k) => k >= 0);
    if (posisi.length <= 2) {
      if (!posisi.every((k) => MIRIP.has(nilai[k] + w[k]))) return { nilai: "", keyakinan: "LOW" };
      nilai = w + nilai.slice(6);
      keyakinan = "MEDIUM";
    }
  }

  const tengah = nilai.slice(6, 12);
  if (opsi.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(opsi.tanggal) && !opsi.tanggalRagu) {
    const calon = opsi.jk === "P" ? [ddmmyy(opsi.tanggal, true)] : opsi.jk === "L" ? [ddmmyy(opsi.tanggal, false)] : [ddmmyy(opsi.tanggal, false), ddmmyy(opsi.tanggal, true)];
    if (calon.includes(tengah)) return { nilai, keyakinan };
    const terdekat = calon.sort((a, b) => beda(a, tengah) - beda(b, tengah))[0];
    const posisi = [...tengah].map((c, k) => (c !== terdekat[k] ? 6 + k : -1)).filter((k) => k >= 0);
    if (posisi.length <= 2 && posisi.every((k) => opsi.posisiKoreksi?.includes(k))) {
      return { nilai: nilai.slice(0, 6) + terdekat + nilai.slice(12), keyakinan: "MEDIUM" };
    }
    return { nilai: "", keyakinan: "LOW" };
  }

  const h = Number(tengah.slice(0, 2));
  const hari = h > 40 ? h - 40 : h;
  return tanggalSah(hari, Number(tengah.slice(2, 4))) ? { nilai, keyakinan: "MEDIUM" } : { nilai: "", keyakinan: "LOW" };
}

/** Nama provinsi baku dari teks hasil baca ("AWA BARAT" menjadi "JAWA BARAT"); null bila tidak cukup mirip. */
export function cocokProvinsi(teks: string, jarak: (a: string, b: string) => number): string | null {
  const t = teks.toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
  if (t.length < 3) return null;
  let terbaik: string | null = null;
  let skor = Infinity;
  for (const p of Object.values(PROVINSI)) {
    const d = jarak(t, p);
    if (d < skor) {
      skor = d;
      terbaik = p;
    }
  }
  return terbaik && skor <= Math.max(1, Math.floor(terbaik.length * 0.2)) ? terbaik : null;
}
