/**
 * Keunggulan jurusan disimpan sebagai daftar baris (tanpa migrasi). Baris yang berakhir titik dua dianggap judul
 * kelompok ("Tempat PKL:"); baris sesudahnya jadi butir kelompok itu. Nomor di awal baris ("1. ", "2)") dibuang
 * karena tampilan sudah memakai daftar.
 */
export type KelompokKeunggulan = { judul: string | null; butir: string[] };

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
    hasil[hasil.length - 1].butir.push(teks.replace(/^\d+\s*[.)]\s+/, ""));
  }
  return hasil.filter((k) => k.butir.length > 0 || k.judul);
}
