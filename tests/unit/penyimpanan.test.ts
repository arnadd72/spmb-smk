// @vitest-environment node
import type { drive_v3 } from "googleapis";
import { describe, expect, it, vi } from "vitest";
import { pecahPath } from "@/server/services/penyimpanan/antarmuka";
import { DriverDrive } from "@/server/services/penyimpanan/driverDrive";
import { DriverSupabaseTemp } from "@/server/services/penyimpanan/driverSupabaseTemp";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("pecahPath", () => {
  it("memisah folder dan nama", () => {
    expect(pecahPath("2027-2028/SPMB-2027-0001 - AHMAD/akta.jpg")).toEqual({
      folder: ["2027-2028", "SPMB-2027-0001 - AHMAD"],
      nama: "akta.jpg",
    });
  });

  it("menolak traversal dan path kosong", () => {
    expect(() => pecahPath("a/../b.txt")).toThrow();
    expect(() => pecahPath("../x")).toThrow();
    expect(() => pecahPath("")).toThrow();
    expect(() => pecahPath("//")).toThrow();
  });
});

function driveTiruan(opsi: { folderSudahAda?: string } = {}) {
  const create = vi.fn(async ({ requestBody }: { requestBody: { name: string; parents?: string[] } }) => ({
    data: { id: `id-${requestBody.name}` },
  }));
  const list = vi.fn(async () => ({ data: { files: opsi.folderSudahAda ? [{ id: opsi.folderSudahAda }] : [] } }));
  const get = vi.fn();
  const del = vi.fn(async () => ({}));
  const drive = { files: { create, list, get, delete: del } } as unknown as drive_v3.Drive;
  return { drive, create, list, get, del };
}

describe("DriverDrive", () => {
  it("membuat folder bersarang lalu mengunggah berkas ke folder terdalam", async () => {
    const { drive, create } = driveTiruan();
    const d = new DriverDrive(drive, "root-id");

    const ref = await d.simpan("2027-2028/SPMB-2027-0001 - AHMAD/akta.jpg", Buffer.from("isi"), "image/jpeg");

    expect(ref).toBe("id-akta.jpg");
    const panggilan = create.mock.calls.map((c) => c[0].requestBody as { name: string; parents: string[] });
    expect(panggilan[0]).toMatchObject({ name: "2027-2028", parents: ["root-id"] });
    expect(panggilan[1]).toMatchObject({ name: "SPMB-2027-0001 - AHMAD", parents: ["id-2027-2028"] });
    expect(panggilan[2]).toMatchObject({ name: "akta.jpg", parents: ["id-SPMB-2027-0001 - AHMAD"] });
  });

  it("opsi publik menandai berkas dengan appProperties; tanpa opsi tidak ada tanda", async () => {
    const { drive, create } = driveTiruan({ folderSudahAda: "folder-ada" });
    const d = new DriverDrive(drive, "root-id");

    await d.simpan("situs/galeri/a.webp", Buffer.from("x"), "image/webp", { publik: true });
    await d.simpan("situs/galeri/b.webp", Buffer.from("x"), "image/webp");

    const badan = create.mock.calls.map((c) => c[0].requestBody as { appProperties?: Record<string, string> });
    expect(badan[0].appProperties).toEqual({ spmb: "publik" });
    expect(badan[1].appProperties).toBeUndefined();
  });

  it("metadataPublik hanya mengembalikan berkas publik yang tidak terhapus", async () => {
    const { drive, get } = driveTiruan();
    const d = new DriverDrive(drive, "root-id");
    get.mockResolvedValueOnce({ data: { mimeType: "image/webp", trashed: false, appProperties: { spmb: "publik" } } });
    expect(await d.metadataPublik("a")).toEqual({ mime: "image/webp" });
    get.mockResolvedValueOnce({ data: { mimeType: "image/webp", trashed: true, appProperties: { spmb: "publik" } } });
    expect(await d.metadataPublik("b")).toBeNull();
    get.mockResolvedValueOnce({ data: { mimeType: "image/jpeg", trashed: false } });
    expect(await d.metadataPublik("c")).toBeNull();
    get.mockRejectedValueOnce(Object.assign(new Error("not found"), { code: 404 }));
    expect(await d.metadataPublik("d")).toBeNull();
  });

  it("memakai ulang folder yang sudah ada dan tidak membuat duplikat", async () => {
    const { drive, create } = driveTiruan({ folderSudahAda: "folder-ada" });
    const d = new DriverDrive(drive, "root-id");

    await d.simpan("2027-2028/kk.jpg", Buffer.from("x"));

    expect(create).toHaveBeenCalledTimes(1);
    expect((create.mock.calls[0][0].requestBody as { parents: string[] }).parents).toEqual(["folder-ada"]);
  });

  it("nama folder dengan tanda kutip di-escape pada query", async () => {
    const { drive, list } = driveTiruan();
    await new DriverDrive(drive, "root-id").simpan("O'Brien/akta.jpg", Buffer.from("x"));

    expect((list.mock.calls[0] as unknown as [{ q: string }])[0].q).toContain("name = 'O\\'Brien'");
  });

  it("ada(): false bila 404 atau di sampah, true bila aktif, galat lain dilempar", async () => {
    const { drive, get } = driveTiruan();
    const d = new DriverDrive(drive, "root-id");

    get.mockRejectedValueOnce({ code: 404 });
    expect(await d.ada("hilang")).toBe(false);

    get.mockResolvedValueOnce({ data: { id: "a", trashed: true } });
    expect(await d.ada("sampah")).toBe(false);

    get.mockResolvedValueOnce({ data: { id: "b", trashed: false } });
    expect(await d.ada("aktif")).toBe(true);

    get.mockRejectedValueOnce({ code: 500 });
    await expect(d.ada("rusak")).rejects.toBeDefined();
  });

  it("hapus memanggil files.delete dengan ID berkas", async () => {
    const { drive, del } = driveTiruan();
    await new DriverDrive(drive, "root-id").hapus("file-x");
    expect(del).toHaveBeenCalledWith({ fileId: "file-x" });
  });

  it("hapusFolderInduk menghapus folder induk bila nama diawali awalan", async () => {
    const { drive, get, del } = driveTiruan();
    get.mockResolvedValueOnce({ data: { parents: ["folder-pendaftar"] } }).mockResolvedValueOnce({ data: { name: "SPMB-2027-0001 - AHMAD" } });
    await expect(new DriverDrive(drive, "root-id").hapusFolderInduk("file-x", "SPMB-2027-0001 - ")).resolves.toBe(true);
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith({ fileId: "folder-pendaftar" });
  });

  it("hapusFolderInduk menolak bila nama folder tidak cocok awalan", async () => {
    const { drive, get, del } = driveTiruan();
    get.mockResolvedValueOnce({ data: { parents: ["folder-lain"] } }).mockResolvedValueOnce({ data: { name: "SPMB-2027-0002 - BUDI" } });
    await expect(new DriverDrive(drive, "root-id").hapusFolderInduk("file-x", "SPMB-2027-0001 - ")).rejects.toThrow(/tidak cocok/);
    expect(del).not.toHaveBeenCalled();
  });

  it("hapusFolderInduk menolak bila induk adalah folder akar", async () => {
    const { drive, get, del } = driveTiruan();
    get.mockResolvedValueOnce({ data: { parents: ["root-id"] } });
    await expect(new DriverDrive(drive, "root-id").hapusFolderInduk("file-x", "SPMB-2027-0001 - ")).rejects.toThrow(/akar/);
    expect(del).not.toHaveBeenCalled();
  });

  it("hapusFolderInduk tidak melempar dan tidak menghapus apa pun bila berkas sudah tidak ada (404)", async () => {
    const { drive, get, del } = driveTiruan();
    get.mockRejectedValueOnce(Object.assign(new Error("not found"), { code: 404 }));
    await expect(new DriverDrive(drive, "root-id").hapusFolderInduk("file-hilang", "SPMB-2027-0001 - ")).resolves.toBe(false);
    expect(del).not.toHaveBeenCalled();
  });

  it("menolak path traversal sebelum memanggil Drive", async () => {
    const { drive, create } = driveTiruan();
    await expect(new DriverDrive(drive, "root-id").simpan("a/../b", Buffer.from("x"))).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});

describe("DriverSupabaseTemp", () => {
  function supabaseTiruan() {
    const upload = vi.fn(async () => ({ error: null }));
    const remove = vi.fn(async () => ({ error: null }));
    const download = vi.fn(async () => ({ data: new Blob(["halo"]), error: null }));
    const list = vi.fn(async () => ({ data: [{ name: "akta-abc.jpg" }], error: null }));
    const from = vi.fn(() => ({ upload, remove, download, list }));
    return { client: { storage: { from } } as unknown as SupabaseClient, from, upload, remove, download, list };
  }

  it("simpan ke bucket draf-temp dan mengembalikan path objek", async () => {
    const { client, from, upload } = supabaseTiruan();
    const ref = await new DriverSupabaseTemp(client, "draf-temp").simpan("draf1/akta-abc.jpg", Buffer.from("x"), "image/jpeg");

    expect(ref).toBe("draf1/akta-abc.jpg");
    expect(from).toHaveBeenCalledWith("draf-temp");
    expect(upload).toHaveBeenCalledWith("draf1/akta-abc.jpg", expect.any(Buffer), { contentType: "image/jpeg", upsert: false });
  });

  it("ambilStream mengembalikan isi berkas", async () => {
    const { client } = supabaseTiruan();
    const stream = await new DriverSupabaseTemp(client, "draf-temp").ambilStream("draf1/akta-abc.jpg");
    const potongan: Buffer[] = [];
    for await (const p of stream) potongan.push(Buffer.from(p));
    expect(Buffer.concat(potongan).toString()).toBe("halo");
  });

  it("ada() mencari nama berkas di folder induknya", async () => {
    const { client, list } = supabaseTiruan();
    const d = new DriverSupabaseTemp(client, "draf-temp");

    expect(await d.ada("draf1/akta-abc.jpg")).toBe(true);
    expect(await d.ada("draf1/lain.jpg")).toBe(false);
    expect(list).toHaveBeenCalledWith("draf1", { search: "akta-abc.jpg" });
  });

  it("galat dari Supabase dilempar sebagai Error", async () => {
    const { client, upload } = supabaseTiruan();
    upload.mockResolvedValueOnce({ error: { message: "bucket tidak ada" } } as never);
    await expect(new DriverSupabaseTemp(client, "draf-temp").simpan("a/b.jpg", Buffer.from("x"))).rejects.toThrow(/bucket tidak ada/);
  });
});
