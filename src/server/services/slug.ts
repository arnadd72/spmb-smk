/** "Juara Lomba LKS 2026!" -> "juara-lomba-lks-2026". Hanya huruf, angka, dan tanda hubung. */
export function buatSlug(teks: string, maks = 80): string {
  const dasar = teks
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maks)
    .replace(/-+$/g, "");
  return dasar || "tanpa-judul";
}

/** Tambahkan akhiran -2, -3, ... sampai `tersedia` menyatakan slug belum dipakai. */
export async function slugUnik(teks: string, tersedia: (slug: string) => Promise<boolean>): Promise<string> {
  const dasar = buatSlug(teks);
  if (await tersedia(dasar)) return dasar;
  for (let i = 2; i < 1000; i++) {
    const kandidat = `${dasar}-${i}`;
    if (await tersedia(kandidat)) return kandidat;
  }
  return `${dasar}-${Date.now()}`;
}
