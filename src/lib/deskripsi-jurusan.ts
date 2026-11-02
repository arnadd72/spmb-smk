import { uraiButir, type KelompokKeunggulan } from "./keunggulan-jurusan";

/**
 * Deskripsi jurusan satu kolom teks yang boleh berisi paragraf dan daftar. Dipecah per baris kosong:
 * - potongan yang diawali baris berakhir titik dua ("Tempat PKL:") atau seluruhnya berpenanda ("1. ...") jadi daftar;
 * - daftar yang berurutan dikumpulkan agar tampil berjajar ke samping;
 * - sisanya paragraf biasa (baris barunya dipertahankan).
 */
export type BlokDeskripsi = { tipe: "paragraf"; teks: string } | { tipe: "kumpulan"; daftar: KelompokKeunggulan[] };

const judulDari = (baris: string) => (/:$/.test(baris) ? baris.replace(/\s*:$/, "").trim() : null);

export function bacaDeskripsi(teks: string | null | undefined): BlokDeskripsi[] {
  const potongan = (teks ?? "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((c) => c.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((c) => c.length > 0);

  const blok: BlokDeskripsi[] = [];
  let judulTertunda: string | null = null; // judul yang berdiri sendiri, isinya ada di potongan berikutnya

  const lepaskanJudul = () => {
    if (judulTertunda !== null) blok.push({ tipe: "paragraf", teks: `${judulTertunda}:` });
    judulTertunda = null;
  };
  const tambahDaftar = (d: KelompokKeunggulan) => {
    const akhir = blok[blok.length - 1];
    if (akhir?.tipe === "kumpulan") akhir.daftar.push(d);
    else blok.push({ tipe: "kumpulan", daftar: [d] });
  };

  for (const baris of potongan) {
    const judul = judulDari(baris[0]);
    const sisa = judul !== null ? baris.slice(1) : baris;

    if (judul !== null && sisa.length === 0) {
      lepaskanJudul();
      judulTertunda = judul;
      continue;
    }

    const butir = sisa.map(uraiButir);
    if (judul !== null) {
      lepaskanJudul();
      tambahDaftar({ judul, butir });
    } else if (butir.every((b) => b.penanda)) {
      tambahDaftar({ judul: judulTertunda, butir });
      judulTertunda = null;
    } else {
      lepaskanJudul();
      blok.push({ tipe: "paragraf", teks: baris.join("\n") });
    }
  }
  lepaskanJudul();
  return blok;
}

/** Paragraf pertama (sampai baris kosong pertama) dalam satu baris, untuk ringkasan dan deskripsi meta. */
export function paragrafPertama(teks: string | null | undefined): string {
  return (teks ?? "").replace(/\r\n?/g, "\n").trim().split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, " ").trim();
}
