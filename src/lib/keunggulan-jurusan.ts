/**
 * Daftar butir jurusan (Keunggulan dan daftar di dalam Deskripsi) disimpan sebagai baris teks (tanpa migrasi). Baris yang
 * berakhir titik dua dianggap judul kelompok ("Tempat PKL:"); baris sesudahnya jadi butir kelompok itu. Penanda butir
 * (titik, strip, atau nomor) TIDAK ditambahkan otomatis: admin menulisnya sendiri. Bila baris diawali penanda, penanda
 * dipisah dari isinya hanya agar baris yang panjang rata di bawah isinya, bukan di bawah penanda; teksnya tidak diubah.
 */
export type ButirKeunggulan = { penanda: string | null; isi: string };
export type KelompokKeunggulan = { judul: string | null; butir: ButirKeunggulan[] };

const PENANDA = /^(\d+[.)]|[•·\-–*])\s+(\S[\s\S]*)$/;

export function uraiButir(baris: string): ButirKeunggulan {
  const teks = baris.trim();
  const cocok = PENANDA.exec(teks);
  return cocok ? { penanda: cocok[1], isi: cocok[2] } : { penanda: null, isi: teks };
}

export function kelompokkanKeunggulan(baris: readonly string[]): KelompokKeunggulan[] {
  const hasil: KelompokKeunggulan[] = [];
  for (const mentah of baris) {
    const teks = mentah.trim();
    if (!teks) continue;
    if (/:$/.test(teks)) {
      hasil.push({ judul: teks.replace(/\s*:$/, "").trim(), butir: [] });
      continue;
    }
    if (hasil.length === 0) hasil.push({ judul: null, butir: [] });
    hasil[hasil.length - 1].butir.push(uraiButir(teks));
  }
  return hasil;
}
