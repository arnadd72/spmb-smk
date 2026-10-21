import { Readable } from "node:stream";
import type { ReadableStream as AliranWeb } from "node:stream/web";
import { hapusGambarCloudinary, unggahGambar, urlTerautentikasi, type KonfigCloudinary } from "@/server/services/cloudinary";
import { pecahPath, type PenyimpananDokumen } from "./antarmuka";

/** Awalan referensi berkas milik Cloudinary di database; rujukan tanpa awalan ini milik penyimpanan sementara lama. */
export const AWALAN_REF_CLOUDINARY = "cld:";

/** Pas foto cukup kecil untuk kotak 3x4 di formulir dan layar verifikasi, tetapi tetap tajam. */
const TRANSFORMASI_PAS_FOTO = "c_limit,w_900,h_1200,q_auto:good";

export const adalahRefCloudinary = (ref: string) => ref.startsWith(AWALAN_REF_CLOUDINARY);

/**
 * Pas foto pendaftar di Cloudinary (PRD v4 butir 58). Jenis pengiriman `authenticated`: gambar tidak punya URL publik,
 * hanya server yang bisa membukanya lewat URL bertanda tangan, sama seperti aturan dokumen pendaftar.
 */
export class DriverCloudinary implements PenyimpananDokumen {
  constructor(
    private readonly k: KonfigCloudinary,
    private readonly folder = "spmb/pas-foto",
  ) {}

  private idDari(ref: string): string {
    if (!adalahRefCloudinary(ref)) throw new Error("Referensi bukan milik Cloudinary.");
    const id = ref.slice(AWALAN_REF_CLOUDINARY.length);
    if (!id || id.includes("..")) throw new Error("Referensi berkas tidak valid.");
    return id;
  }

  async simpan(path: string, isi: Buffer, mime = "application/octet-stream"): Promise<string> {
    pecahPath(path); // menolak traversal dan path kosong
    const tanpaEkstensi = path.replace(/\.[^./]+$/, "");
    const id = await unggahGambar(this.k, isi, mime, { publicId: `${this.folder}/${tanpaEkstensi}`, akses: "authenticated", transformasi: TRANSFORMASI_PAS_FOTO });
    return AWALAN_REF_CLOUDINARY + id;
  }

  async ambilStream(ref: string): Promise<Readable> {
    const res = await fetch(urlTerautentikasi(this.k, this.idDari(ref)));
    if (!res.ok || !res.body) throw new Error(`Gagal mengambil berkas dari Cloudinary (${res.status}).`);
    return Readable.fromWeb(res.body as unknown as AliranWeb);
  }

  async hapus(ref: string): Promise<void> {
    await hapusGambarCloudinary(this.k, this.idDari(ref), "authenticated");
  }

  async ada(ref: string): Promise<boolean> {
    const res = await fetch(urlTerautentikasi(this.k, this.idDari(ref)), { method: "HEAD" });
    return res.ok;
  }
}
