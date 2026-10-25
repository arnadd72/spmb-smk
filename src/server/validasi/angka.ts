// Isian angka yang diperiksa langsung saat mengetik (NIK, Nomor KK, NISN, nomor telepon). Modul murni: dipakai kolom
// formulir dan kartu hasil baca OCR di klien, dan harus selalu selaras dengan skema simpan di wizard.ts (dijaga tes).

export type AturanAngka = {
  /** Jumlah digit minimum dan maksimum yang sah. Sama berarti harus tepat. */
  min: number;
  max: number;
  /** Nama isian untuk pesan, mis. "NIK" atau "Nomor HP". */
  nama: string;
};

export type StatusAngka = { status: "kosong" | "kurang" | "benar"; jumlah: number; pesan: string };

const TEPAT_16 = new Set(["nik", "nik_ayah", "nik_ibu", "no_kk"]);
const NAMA: Record<string, string> = { nik: "NIK", nik_ayah: "NIK", nik_ibu: "NIK", no_kk: "Nomor KK", nisn: "NISN" };

/** Aturan angka untuk satu isian, atau null bila isian itu bukan isian angka yang diperiksa langsung. */
export function aturanAngka(kunci: string, tipe?: string): AturanAngka | null {
  if (TEPAT_16.has(kunci)) return { min: 16, max: 16, nama: NAMA[kunci] };
  if (kunci === "nisn") return { min: 10, max: 10, nama: NAMA.nisn };
  if (tipe === "tel") return { min: 9, max: 13, nama: "Nomor HP" };
  return null;
}

/** Buang semua selain angka dan potong ke maksimum. `hurufDibuang` dan `kelebihan` memberi tahu apa yang dibuang. */
export function saringAngka(aturan: AturanAngka, mentah: string): { nilai: string; hurufDibuang: boolean; kelebihan: boolean } {
  const digit = mentah.replace(/\D/g, "");
  return { nilai: digit.slice(0, aturan.max), hurufDibuang: digit.length !== mentah.length, kelebihan: digit.length > aturan.max };
}

/** Status isian terhadap aturannya: kosong, belum cukup digit (peringatan), atau sudah benar. */
export function periksaAngka(aturan: AturanAngka, nilai: string): StatusAngka {
  const jumlah = nilai.length;
  if (jumlah === 0) return { status: "kosong", jumlah, pesan: "" };
  if (!/^\d+$/.test(nilai) || jumlah < aturan.min || jumlah > aturan.max) {
    const syarat = aturan.min === aturan.max ? `${aturan.nama} harus tepat ${aturan.max} digit angka.` : `${aturan.nama} harus ${aturan.min} sampai ${aturan.max} digit angka.`;
    const awal = aturan.min === aturan.max ? `Baru ${jumlah} dari ${aturan.max} digit.` : `Baru ${jumlah} digit.`;
    return { status: "kurang", jumlah, pesan: `${awal} ${syarat}` };
  }
  return { status: "benar", jumlah, pesan: `${jumlah} digit, sudah benar.` };
}
