import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { konteksValidasi, validasiLangkah } from "@/server/services/draf";
import { hashToken } from "@/server/services/kripto";
import { susunKolom } from "@/server/services/pendaftarKolom";
import { nomorBerikut } from "@/server/services/pendaftaran";
import { hitungRekomendasi, muatBobotJurusan } from "@/server/services/rekomendasi";
import { GalatApi } from "@/server/types/galat";
import { skemaNilaiRapor, type NilaiRapor } from "@/server/validasi/wizard";
import type { Prisma } from "@/generated/prisma/client";
import type { KonteksAksi } from "./konten";

// Input manual pendaftar luring (PRD v3.1 13.7): form yang sama dengan wizard (tanpa persetujuan dan unggah berkas),
// nomor dari generator yang sama, rekomendasi dihitung bila nilai rapor diisi. Berkas diunggah sesudahnya dari halaman detail.

const LANGKAH = [1, 4, 5, 6, 7];

export async function buatPendaftarManual(masukan: unknown, ctx: KonteksAksi) {
  const mentah = (masukan ?? {}) as Record<string, unknown>;
  const statusAwal = mentah.status_awal === "pending" ? "pending" : "approved";

  const konteks = await konteksValidasi();
  const hasil: Record<string, unknown> = {};
  const galat: Record<string, string[]> = {};
  for (const n of LANGKAH) {
    try {
      Object.assign(hasil, validasiLangkah(n, { ...mentah, setuju: true }, {}, konteks));
    } catch (e) {
      if (e instanceof GalatApi && e.errors) Object.assign(galat, e.errors);
      else throw e;
    }
  }

  // Nilai rapor opsional (siswa luring mungkin belum membawa rapor): hanya sel yang diisi divalidasi.
  const semester = konteks.semester;
  const cekRapor = skemaNilaiRapor(semester, []).safeParse({ semester, mapel: (mentah.nilai_rapor as { mapel?: unknown } | undefined)?.mapel ?? {} });
  if (!cekRapor.success) {
    for (const i of cekRapor.error.issues) (galat[`nilai_rapor.${i.path.slice(1).join(".")}`] ??= []).push(i.message);
  }
  if (Object.keys(galat).length > 0 || !cekRapor.success) throw GalatApi.validasi(galat);
  const rapor: NilaiRapor = cekRapor.data;

  const bobot = await muatBobotJurusan();
  const idJurusan = (kode: unknown) => bobot.find((j) => j.kode === kode)?.id;
  const jurusan1 = idJurusan(hasil.jurusan_1);
  if (!jurusan1) throw GalatApi.validasi({ jurusan_1: ["Pilihan jurusan tidak valid."] });
  const jurusan2 = hasil.jurusan_2 ? idJurusan(hasil.jurusan_2) : undefined;

  const adaNilai = Object.keys(rapor.mapel).length > 0;
  const rekom = hitungRekomendasi(rapor, bobot);
  const terbaik = adaNilai ? rekom.peringkat.find((p) => p.label === "Paling Sesuai") : undefined;
  const { kolom, kustom } = susunKolom(hasil);
  const periode = konteks.konfig.tahunAjaran;
  const tahun = periode.split("/")[0];

  const baru = await prisma.$transaction(async (tx) => {
    const nomor = await nomorBerikut(tx, tahun);
    return tx.pendaftar.create({
      data: {
        nomorPendaftaran: nomor,
        aksesTokenHash: hashToken(randomBytes(32).toString("hex")),
        periode,
        sumber: "luring",
        statusVerifikasi: statusAwal,
        ...(statusAwal === "approved" ? { diverifikasiOlehId: BigInt(ctx.userId), diverifikasiAt: new Date() } : {}),
        statusNilai: adaNilai ? "sesuai" : "belumDicek",
        namaLengkap: String(hasil.nama_lengkap),
        ...kolom,
        nilaiRapor: JSON.parse(JSON.stringify(rapor)),
        nilaiRaporSumber: "manual",
        rekomendasiJurusanId: terbaik ? BigInt(terbaik.jurusanId) : null,
        rekomendasiSkor: adaNilai ? JSON.parse(JSON.stringify(rekom.peringkat)) : [],
        rekomendasiVersi: rekom.versi,
        jurusan1Id: BigInt(jurusan1),
        jurusan2Id: jurusan2 ? BigInt(jurusan2) : null,
        dataKustom: Object.keys(kustom).length > 0 ? JSON.parse(JSON.stringify(kustom)) : undefined,
        berkasMeta: {},
        berkasSinkron: "selesai",
      } as Prisma.PendaftarUncheckedCreateInput,
    });
  });

  await catatAudit({
    userId: ctx.userId,
    aksi: "pendaftar.input_manual",
    entitasTipe: "pendaftar",
    entitasId: baru.id.toString(),
    dataBaru: { nomor: baru.nomorPendaftaran, nama: baru.namaLengkap, status: statusAwal },
    ip: ctx.ip,
  });
  return { id: baru.id.toString(), nomor: baru.nomorPendaftaran };
}
