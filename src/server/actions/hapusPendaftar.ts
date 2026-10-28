import type { ZodType } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";
import type { Berkas, BerkasDraf } from "@/server/services/draf";
import { pastikanPasswordSuperadmin } from "@/server/services/konfirmasiPassword";
import { penyimpananDokumen, penyimpananTemp } from "@/server/services/penyimpanan";
import { statusDrive } from "@/server/services/penyimpanan/driveOAuth";
import { semuaIdDrive } from "@/server/services/pendaftaran";
import { GalatApi } from "@/server/types/galat";
import type { BarisHapus, HasilHapus, HasilPratinjau } from "@/server/types/hapusPendaftar";
import { MAKS_HAPUS, skemaHapus, skemaPilihanHapus, type PilihanHapus } from "@/server/validasi/hapusPendaftar";

// Hapus pendaftar permanen (PRD 1.3 butir 75): database, catatan OCR, berkas sementara, dan folder Drive. Hanya superadmin
// (dijaga rute API). Log audit tetap, tanpa data sensitif. Penghapusan Drive lebih dulu: bila gagal, pendaftar itu dibiarkan
// utuh supaya tidak ada folder Drive yatim tanpa catatan.

export type { BarisHapus, HasilHapus, HasilPratinjau };

const WIB = 7 * 3600_000;
const SELECT_BARIS = { id: true, nomorPendaftaran: true, namaLengkap: true, createdAt: true, sumber: true } as const;

function urai<T>(skema: ZodType<T>, mentah: unknown): T {
  const hasil = skema.safeParse(mentah);
  if (hasil.success) return hasil.data;
  const errors: Record<string, string[]> = {};
  for (const isu of hasil.error.issues) (errors[isu.path.join(".") || "input"] ??= []).push(isu.message);
  throw GalatApi.validasi(errors);
}

const baris = (p: { id: bigint; nomorPendaftaran: string; namaLengkap: string; createdAt: Date; sumber: string }): BarisHapus => ({
  id: p.id.toString(),
  nomor: p.nomorPendaftaran,
  nama: p.namaLengkap,
  tanggal: new Date(p.createdAt.getTime() + WIB).toISOString().slice(0, 10),
  sumber: p.sumber,
});

/** Pendaftar untuk dicentang pada tab manual: terbaru dulu, maksimal 50, dicari lewat nama atau nomor. */
export async function cariUntukHapus(q: string, periode: string): Promise<BarisHapus[]> {
  const kata = q.trim().slice(0, 100);
  const where: Prisma.PendaftarWhereInput = {
    ...(periode !== "semua" ? { periode } : {}),
    ...(kata ? { OR: [{ namaLengkap: { contains: kata, mode: "insensitive" } }, { nomorPendaftaran: { contains: kata, mode: "insensitive" } }] } : {}),
  };
  const hasil = await prisma.pendaftar.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50, select: SELECT_BARIS });
  return hasil.map(baris);
}

async function idDariPilihan(pilihan: PilihanHapus): Promise<bigint[]> {
  if (pilihan.mode === "manual") {
    const ada = await prisma.pendaftar.findMany({ where: { id: { in: pilihan.ids.map((i) => BigInt(i)) } }, select: { id: true } });
    return ada.map((p) => p.id);
  }
  if (pilihan.mode === "tanggal") {
    if (Number.isNaN(Date.parse(pilihan.dari)) || Number.isNaN(Date.parse(pilihan.sampai))) throw GalatApi.validasi({ dari: ["Tanggal tidak sah."] });
    if (pilihan.dari > pilihan.sampai) throw GalatApi.validasi({ dari: ["Tanggal awal tidak boleh setelah tanggal akhir."] });
    const awal = new Date(`${pilihan.dari}T00:00:00+07:00`);
    const akhir = new Date(new Date(`${pilihan.sampai}T00:00:00+07:00`).getTime() + 86400_000);
    const ada = await prisma.pendaftar.findMany({
      where: { periode: pilihan.periode, createdAt: { gte: awal, lt: akhir } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: MAKS_HAPUS + 1,
      select: { id: true },
    });
    return ada.map((p) => p.id);
  }
  if (pilihan.dari > pilihan.sampai) throw GalatApi.validasi({ dari: ["Nomor awal tidak boleh lebih besar dari nomor akhir."] });
  const ada = await prisma.$queryRaw<{ id: bigint }[]>`
    SELECT "id" FROM "Pendaftar"
    WHERE "periode" = ${pilihan.periode}
      AND "nomorPendaftaran" ~ '-[0-9]{4}$'
      AND CAST(RIGHT("nomorPendaftaran", 4) AS INTEGER) BETWEEN ${pilihan.dari} AND ${pilihan.sampai}
    ORDER BY "createdAt" ASC, "id" ASC
    LIMIT ${MAKS_HAPUS + 1}`;
  return ada.map((p) => p.id);
}

/** Daftar yang akan terhapus untuk satu pilihan. Menolak rentang tak sah, tanpa hasil, atau lebih dari MAKS_HAPUS. */
export async function pratinjauHapus(mentah: unknown): Promise<HasilPratinjau> {
  const pilihan = urai(skemaPilihanHapus, mentah);
  const ids = await idDariPilihan(pilihan);
  if (ids.length === 0) throw GalatApi.validasi({ rentang: ["Tidak ada pendaftar yang cocok dengan pilihan ini."] });
  if (ids.length > MAKS_HAPUS) throw GalatApi.validasi({ rentang: [`Lebih dari ${MAKS_HAPUS} pendaftar cocok. Persempit rentang pilihan.`] });
  const contoh = await prisma.pendaftar.findMany({ where: { id: { in: ids.slice(0, 20) } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: SELECT_BARIS });
  return { total: ids.length, ids: ids.map((i) => i.toString()), contoh: contoh.map(baris) };
}

function refSementara(meta: unknown): string[] {
  return Object.values((meta ?? {}) as BerkasDraf)
    .flatMap((v) => (Array.isArray(v) ? v : v ? [v] : []))
    .map((b: Berkas) => b.ref);
}

/** Hapus satu per satu. Yang gagal dilaporkan dan dibiarkan utuh; yang sudah tidak ada dilewati. */
export async function hapusPendaftar(sesi: { sub: string }, mentah: unknown, ip?: string): Promise<HasilHapus> {
  const input = urai(skemaHapus, mentah);
  await pastikanPasswordSuperadmin(sesi.sub, input.password, `hapus:${sesi.sub}`, ip);

  const hasil: HasilHapus = { terhapus: 0, dilewati: 0, gagal: [], folderHilang: [] };
  for (const idTeks of input.ids) {
    const p = await prisma.pendaftar.findUnique({ where: { id: BigInt(idTeks) } });
    if (!p) {
      hasil.dilewati++;
      continue;
    }
    try {
      // Coba tiap berkas Drive sampai folder ditemukan dan terhapus; bila semuanya sudah hilang dari Drive, pendaftar tetap
      // dihapus dan nomornya dilaporkan supaya folder yang mungkin tersisa diperiksa manual.
      const idDrive = semuaIdDrive(p);
      let folderHilang = false;
      if (idDrive.length > 0) {
        if (!(await statusDrive().catch(() => ({ terhubung: false }))).terhubung) {
          throw new Error("Google Drive belum terhubung, folder berkas tidak bisa dihapus.");
        }
        const drive = await penyimpananDokumen();
        let folderTerhapus = false;
        for (const id of idDrive) {
          if (await drive.hapusFolderInduk(id, `${p.nomorPendaftaran} - `)) {
            folderTerhapus = true;
            break;
          }
        }
        folderHilang = !folderTerhapus;
      }
      const temp = penyimpananTemp();
      for (const ref of refSementara(p.berkasMeta)) await temp.hapus(ref).catch(() => undefined);

      // Audit ikut dalam transaksi yang sama: tidak ada pendaftar terhapus tanpa catatan, dan galat audit tidak salah dilaporkan.
      await prisma.$transaction([
        prisma.ocrHasil.deleteMany({ where: { pendaftarId: p.id } }),
        prisma.pendaftar.delete({ where: { id: p.id } }),
        prisma.auditLog.create({
          data: {
            userId: BigInt(sesi.sub),
            aksi: "pendaftar.hapus",
            entitasTipe: "pendaftar",
            entitasId: p.id.toString(),
            dataLama: { nomor: p.nomorPendaftaran, nama: p.namaLengkap, periode: p.periode, sumber: p.sumber },
            ...(folderHilang ? { dataBaru: { folderDrive: "tidak-ditemukan" } } : {}),
            ip,
          },
        }),
      ]);
      if (folderHilang) hasil.folderHilang.push(p.nomorPendaftaran);
      hasil.terhapus++;
    } catch (e) {
      hasil.gagal.push({ nomor: p.nomorPendaftaran, pesan: e instanceof Error ? e.message : "Gagal menghapus pendaftar." });
    }
  }
  return hasil;
}
