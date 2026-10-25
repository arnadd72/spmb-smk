import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { pecahPath, type PenyimpananDokumen } from "./antarmuka";

/**
 * Berkas sementara wizard di disk lokal, HANYA untuk pengembangan Fase A tanpa Supabase (keputusan PRD 1.3).
 * Di Vercel disk tidak persisten, jadi driver ini tidak dipakai di produksi (lihat index.ts).
 */
export class DriverLokal implements PenyimpananDokumen {
  constructor(private readonly akar: string) {}

  private lokasi(referensi: string): string {
    pecahPath(referensi); // tolak traversal
    const penuh = path.resolve(this.akar, ...referensi.split("/").filter(Boolean));
    if (!penuh.startsWith(path.resolve(this.akar) + path.sep)) throw new Error("Path berkas tidak valid.");
    return penuh;
  }

  async simpan(pathBerkas: string, isi: Buffer): Promise<string> {
    const bersih = pathBerkas.split("/").filter(Boolean).join("/");
    const tujuan = this.lokasi(bersih);
    await mkdir(path.dirname(tujuan), { recursive: true });
    await writeFile(tujuan, isi, { flag: "wx" });
    return bersih;
  }

  async ambilStream(referensi: string): Promise<Readable> {
    const lokasi = this.lokasi(referensi);
    await stat(lokasi);
    return createReadStream(lokasi);
  }

  async perbarui(referensi: string, isi: Buffer): Promise<void> {
    await writeFile(this.lokasi(referensi), isi);
  }

  async gantiNamaFolder(): Promise<void> {}

  async hapus(referensi: string): Promise<void> {
    await rm(this.lokasi(referensi), { force: true });
  }

  async ada(referensi: string): Promise<boolean> {
    try {
      await stat(this.lokasi(referensi));
      return true;
    } catch {
      return false;
    }
  }
}
