import { Readable } from "node:stream";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pecahPath, type PenyimpananDokumen } from "./antarmuka";

/**
 * Berkas sementara wizard di bucket privat Supabase Storage (PRD v4 7.4), karena disk Vercel tidak
 * persisten antar request. Referensi = path objek di bucket.
 */
export class DriverSupabaseTemp implements PenyimpananDokumen {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly bucket: string,
  ) {}

  async simpan(path: string, isi: Buffer, mime = "application/octet-stream"): Promise<string> {
    pecahPath(path); // validasi saja
    const bersih = path.split("/").filter(Boolean).join("/");
    const { error } = await this.supabase.storage.from(this.bucket).upload(bersih, isi, {
      contentType: mime,
      upsert: false,
    });
    if (error) throw new Error(`Gagal menyimpan berkas sementara: ${error.message}`);
    return bersih;
  }

  async ambilStream(referensi: string): Promise<Readable> {
    const { data, error } = await this.supabase.storage.from(this.bucket).download(referensi);
    if (error || !data) throw new Error(`Berkas sementara tidak ditemukan: ${error?.message ?? referensi}`);
    return Readable.from(Buffer.from(await data.arrayBuffer()));
  }

  async perbarui(referensi: string, isi: Buffer, mime = "application/octet-stream"): Promise<void> {
    const { error } = await this.supabase.storage.from(this.bucket).upload(referensi, isi, { contentType: mime, upsert: true });
    if (error) throw new Error(`Gagal memperbarui berkas sementara: ${error.message}`);
  }

  async gantiNamaFolder(): Promise<void> {}

  async hapusFolderInduk(): Promise<void> {}

  async hapus(referensi: string): Promise<void> {
    const { error } = await this.supabase.storage.from(this.bucket).remove([referensi]);
    if (error) throw new Error(`Gagal menghapus berkas sementara: ${error.message}`);
  }

  async ada(referensi: string): Promise<boolean> {
    const bagian = referensi.split("/");
    const nama = bagian.pop() as string;
    const { data, error } = await this.supabase.storage.from(this.bucket).list(bagian.join("/"), { search: nama });
    if (error) throw new Error(`Gagal memeriksa berkas sementara: ${error.message}`);
    return (data ?? []).some((f) => f.name === nama);
  }
}
