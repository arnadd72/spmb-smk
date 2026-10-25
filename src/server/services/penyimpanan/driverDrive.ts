import { Readable } from "node:stream";
import type { drive_v3 } from "googleapis";
import { pecahPath, type PenyimpananDokumen } from "./antarmuka";

const MIME_FOLDER = "application/vnd.google-apps.folder";
const KUNCI_TANDA = "spmb";

/**
 * Penyimpanan dokumen pendaftar di Google Drive (scope drive.file). File dan folder tidak pernah
 * dibagikan. Port TypeScript dari GoogleDriveDokumen.php (arsip) dengan perilaku yang sama.
 */
export class DriverDrive implements PenyimpananDokumen {
  private cacheFolder = new Map<string, string>();

  constructor(
    private readonly drive: drive_v3.Drive,
    private readonly idFolderRoot: string,
  ) {}

  /** `publik` menandai berkas (appProperties) sebagai foto web yang boleh dikirim route media; dokumen pendaftar tidak pernah. */
  async simpan(path: string, isi: Buffer, mime = "application/octet-stream", opsi: { publik?: boolean } = {}): Promise<string> {
    const { folder, nama } = pecahPath(path);

    let induk = this.idFolderRoot;
    for (const f of folder) induk = await this.pastikanFolder(f, induk);

    const res = await this.drive.files.create({
      requestBody: { name: nama, parents: [induk], ...(opsi.publik ? { appProperties: { [KUNCI_TANDA]: "publik" } } : {}) },
      media: { mimeType: mime, body: Readable.from(isi) },
      fields: "id",
    });

    const id = res.data.id;
    if (!id) throw new Error("Google Drive tidak mengembalikan ID berkas.");
    return id;
  }

  async ambilStream(referensi: string): Promise<Readable> {
    const res = await this.drive.files.get({ fileId: referensi, alt: "media" }, { responseType: "stream" });
    return res.data as unknown as Readable;
  }

  async hapus(referensi: string): Promise<void> {
    await this.drive.files.delete({ fileId: referensi });
  }

  async perbarui(referensi: string, isi: Buffer, mime = "application/octet-stream", namaBaru?: string): Promise<void> {
    await this.drive.files.update({
      fileId: referensi,
      requestBody: namaBaru ? { name: namaBaru } : {},
      media: { mimeType: mime, body: Readable.from(isi) },
      fields: "id",
    });
  }

  async gantiNamaFolder(referensi: string, namaBaru: string): Promise<void> {
    const berkas = await this.drive.files.get({ fileId: referensi, fields: "parents" });
    const induk = berkas.data.parents?.[0];
    if (!induk || induk === this.idFolderRoot) return; // folder akar bukan milik pendaftar
    const folder = await this.drive.files.get({ fileId: induk, fields: "name" });
    if (folder.data.name === namaBaru) return;
    await this.drive.files.update({ fileId: induk, requestBody: { name: namaBaru }, fields: "id" });
    this.cacheFolder.clear();
  }

  async hapusFolderInduk(referensi: string, awalanNama: string): Promise<void> {
    let induk: string | undefined;
    try {
      induk = (await this.drive.files.get({ fileId: referensi, fields: "parents" })).data.parents?.[0];
    } catch (e) {
      if (kodeGalat(e) === 404) return; // berkas sudah tidak ada di Drive (dihapus manual): tidak ada yang perlu dihapus
      throw e;
    }
    if (!induk || induk === this.idFolderRoot) throw new Error("Folder induk adalah folder akar atau tidak ditemukan, tidak dihapus.");
    const folder = await this.drive.files.get({ fileId: induk, fields: "name" });
    if (!folder.data.name?.startsWith(awalanNama)) throw new Error("Folder tidak cocok dengan pendaftar, tidak dihapus.");
    await this.drive.files.delete({ fileId: induk });
    this.cacheFolder.clear();
  }

  async ada(referensi: string): Promise<boolean> {
    try {
      const res = await this.drive.files.get({ fileId: referensi, fields: "id,trashed" });
      return !res.data.trashed;
    } catch (e) {
      if (kodeGalat(e) === 404) return false;
      throw e;
    }
  }

  /** MIME berkas bila bertanda publik dan tidak terhapus; null untuk selain itu, termasuk berkas yang tidak ada. */
  async metadataPublik(referensi: string): Promise<{ mime: string } | null> {
    try {
      const res = await this.drive.files.get({ fileId: referensi, fields: "mimeType,trashed,appProperties" });
      const d = res.data;
      return !d.trashed && d.appProperties?.[KUNCI_TANDA] === "publik" && d.mimeType ? { mime: d.mimeType } : null;
    } catch (e) {
      if (kodeGalat(e) === 404) return null;
      throw e;
    }
  }

  private async pastikanFolder(nama: string, induk: string): Promise<string> {
    const kunci = `${induk}/${nama}`;
    const tersimpan = this.cacheFolder.get(kunci);
    if (tersimpan) return tersimpan;

    const namaAman = nama.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const cari = await this.drive.files.list({
      q: `name = '${namaAman}' and '${induk}' in parents and mimeType = '${MIME_FOLDER}' and trashed = false`,
      fields: "files(id)",
      pageSize: 1,
    });

    let id = cari.data.files?.[0]?.id ?? undefined;
    if (!id) {
      const buat = await this.drive.files.create({
        requestBody: { name: nama, mimeType: MIME_FOLDER, parents: [induk] },
        fields: "id",
      });
      id = buat.data.id ?? undefined;
    }
    if (!id) throw new Error("Gagal membuat folder di Google Drive.");

    this.cacheFolder.set(kunci, id);
    return id;
  }
}

function kodeGalat(e: unknown): number | undefined {
  const k = (e as { code?: number | string; status?: number }).code ?? (e as { status?: number }).status;
  return typeof k === "number" ? k : Number(k) || undefined;
}
