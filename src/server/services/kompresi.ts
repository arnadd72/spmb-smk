import sharp from "sharp";

// Kompresi gambar sebelum disimpan, supaya kuota Google Drive sekolah hemat. Semua profil memutar gambar sesuai EXIF
// lalu membuang metadata (termasuk lokasi GPS dari HP), dan tidak pernah memperbesar gambar kecil. Berkas bukan gambar
// (PDF) dikembalikan apa adanya.

export type ProfilKompresi = "dokumen" | "pasFoto" | "web" | "logo";

type HasilKompresi = { isi: Buffer; mime: string; ext: string };

const BATAS: Record<ProfilKompresi, { width: number; height: number }> = {
  dokumen: { width: 2000, height: 2000 },
  pasFoto: { width: 900, height: 1200 },
  web: { width: 1600, height: 1600 },
  logo: { width: 512, height: 512 },
};

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/** Profil untuk berkas pendaftar menurut kuncinya. */
export function profilBerkas(kunci: string): ProfilKompresi {
  return kunci === "pas_foto" ? "pasFoto" : "dokumen";
}

/**
 * Perkecil dan kompres gambar menurut profil. Bila hasilnya malah lebih besar, simpan format asli tanpa metadata.
 * Gambar yang tidak bisa dibaca sharp disimpan apa adanya: lebih baik panitia menerima berkas asli daripada pendaftar tertahan.
 */
export async function kompresGambar(isi: Buffer, mime: string, profil: ProfilKompresi): Promise<HasilKompresi> {
  const asli = { isi, mime, ext: EXT[mime] ?? "bin" };
  if (!mime.startsWith("image/")) return asli;
  try {
    return await kompres(isi, mime, profil);
  } catch {
    return asli;
  }
}

async function kompres(isi: Buffer, mime: string, profil: ProfilKompresi): Promise<HasilKompresi> {
  const dasar = sharp(isi).rotate().resize({ ...BATAS[profil], fit: "inside", withoutEnlargement: true });
  const hasil =
    profil === "dokumen" || profil === "pasFoto"
      ? { isi: await dasar.jpeg({ quality: profil === "dokumen" ? 80 : 85, mozjpeg: true }).toBuffer(), mime: "image/jpeg", ext: "jpg" }
      : profil === "web"
        ? { isi: await dasar.webp({ quality: 80 }).toBuffer(), mime: "image/webp", ext: "webp" }
        : { isi: await dasar.webp({ lossless: true }).toBuffer(), mime: "image/webp", ext: "webp" };
  if (hasil.isi.length <= isi.length) return hasil;

  return { isi: await sharp(isi).rotate().toBuffer(), mime, ext: EXT[mime] ?? "bin" };
}
