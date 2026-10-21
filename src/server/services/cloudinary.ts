import { createHash } from "node:crypto";

// Klien Cloudinary minimal lewat REST (unggah bertanda tangan dan hapus), tanpa library tambahan. Hanya modul ini
// dan `media.ts` yang berbicara ke Cloudinary (PRD v4 butir 56). Gambar diperkecil dan dikompres saat diunggah
// (transformasi masuk), lalu dikirim ke pengunjung dengan `f_auto,q_auto` (WebP/AVIF otomatis).

export type KonfigCloudinary = { cloud: string; kunci: string; rahasia: string };

/** `public` untuk gambar situs (URL terbuka); `authenticated` untuk data pribadi (URL harus bertanda tangan). */
export type JenisAkses = "public" | "authenticated";

/** Nama jenis pengiriman di Cloudinary: gambar terbuka bertipe `upload`; `public` bukan nilai yang sah (ditolak 400). */
const tipeCloudinary = (akses: JenisAkses) => (akses === "public" ? "upload" : "authenticated");

/** Batas sisi terpanjang dan kualitas saat disimpan: kecil tetapi tetap jelas. */
export const TRANSFORMASI_MASUK = "c_limit,w_1600,h_1600,q_auto:good";
/** Transformasi pengiriman gambar publik: format dan kualitas dipilih Cloudinary menurut peramban. */
export const TRANSFORMASI_KIRIM = "f_auto,q_auto";

export function konfigCloudinary(): KonfigCloudinary | null {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const kunci = process.env.CLOUDINARY_API_KEY;
  const rahasia = process.env.CLOUDINARY_API_SECRET;
  return cloud && kunci && rahasia ? { cloud, kunci, rahasia } : null;
}

/** Tanda tangan unggah: SHA-1 dari parameter terurut ("a=1&b=2") ditambah rahasia API. */
export function tandaTangan(param: Record<string, string>, rahasia: string): string {
  const baris = Object.keys(param)
    .filter((k) => param[k] !== "")
    .sort()
    .map((k) => `${k}=${param[k]}`)
    .join("&");
  return createHash("sha1").update(baris + rahasia).digest("hex");
}

export const awalanUrlPublik = (cloud: string) => `https://res.cloudinary.com/${cloud}/image/upload/`;

export const urlPublik = (cloud: string, publicId: string) => `${awalanUrlPublik(cloud)}${TRANSFORMASI_KIRIM}/${publicId}`;

/** Ambil public_id dari URL publik buatan `urlPublik`; null bila URL bukan milik akun ini. */
export function publicIdDariUrl(url: string, cloud: string): string | null {
  const awalan = `${awalanUrlPublik(cloud)}${TRANSFORMASI_KIRIM}/`;
  if (!url.startsWith(awalan)) return null;
  const id = url.slice(awalan.length);
  return id && !id.includes("..") ? id : null;
}

async function panggil<T>(k: KonfigCloudinary, aksi: "upload" | "destroy", param: Record<string, string>, berkas?: { isi: Buffer; mime: string }): Promise<T> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const bertanda = { ...param, timestamp };
  const form = new FormData();
  for (const [kunci, nilai] of Object.entries(bertanda)) form.set(kunci, nilai);
  form.set("api_key", k.kunci);
  form.set("signature", tandaTangan(bertanda, k.rahasia));
  if (berkas) form.set("file", new Blob([new Uint8Array(berkas.isi)], { type: berkas.mime }), "berkas");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${k.cloud}/image/${aksi}`, { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Cloudinary ${aksi} gagal (${res.status}): ${json.error?.message ?? "tanpa keterangan"}`);
  return json;
}

/** Unggah gambar. Mengembalikan public_id (tanpa ekstensi) yang disimpan sebagai referensi. */
export async function unggahGambar(
  k: KonfigCloudinary,
  isi: Buffer,
  mime: string,
  opsi: { publicId: string; akses: JenisAkses; transformasi?: string },
): Promise<string> {
  const hasil = await panggil<{ public_id: string }>(
    k,
    "upload",
    { public_id: opsi.publicId, type: tipeCloudinary(opsi.akses), transformation: opsi.transformasi ?? TRANSFORMASI_MASUK, overwrite: "false" },
    { isi, mime },
  );
  return hasil.public_id;
}

export async function hapusGambarCloudinary(k: KonfigCloudinary, publicId: string, akses: JenisAkses = "public"): Promise<void> {
  const { result } = await panggil<{ result?: string }>(k, "destroy", { public_id: publicId, type: tipeCloudinary(akses), invalidate: "true" });
  // "not found" berarti sudah tidak ada: tujuan penghapusan tercapai. Selain "ok" dianggap gagal.
  if (result !== "ok" && result !== "not found") throw new Error(`Cloudinary destroy tidak menghapus berkas (result: ${result ?? "kosong"}).`);
}

/**
 * URL bertanda tangan untuk gambar `authenticated`, dipakai server saat mengambil berkas (mis. pas foto untuk PDF).
 * Tanda tangan: 8 karakter pertama base64url(SHA-1(`{transformasi}/{public_id}` + rahasia)) di segmen `s--...--`.
 */
export function urlTerautentikasi(k: KonfigCloudinary, publicId: string, transformasi = ""): string {
  const bahan = transformasi ? `${transformasi}/${publicId}` : publicId;
  const sig = createHash("sha1").update(bahan + k.rahasia).digest("base64url").slice(0, 8);
  return `https://res.cloudinary.com/${k.cloud}/image/authenticated/s--${sig}--/${bahan}`;
}
