import { tetapkanGelombang } from "@/server/services/gelombang";
import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { konteksValidasi, validasiLangkah } from "@/server/services/draf";
import { hashToken } from "@/server/services/kripto";
import { susunKolom } from "@/server/services/pendaftarKolom";
import { nomorBerikut } from "@/server/services/pendaftaran";
import { muatJurusanAktif } from "@/server/services/rekomendasi";
import { GalatApi } from "@/server/types/galat";
import { VERSI_MINAT } from "@/server/validasi/minat";
import type { Prisma } from "@/generated/prisma/client";
import type { KonteksAksi } from "./konten";

// Input manual pendaftar luring (PRD v3.1 13.7): form yang sama dengan wizard (tanpa persetujuan dan unggah berkas),
// nomor dari generator yang sama. Tanpa tes minat bakat, jadi tanpa saran jurusan. Berkas diunggah sesudahnya dari halaman detail.

const LANGKAH = [1, 4, 5, 6, 7];

export async function buatPendaftarManual(masukan: unknown, ctx: KonteksAksi) {
  const mentah = (masukan ?? {}) as Record<string, unknown>;

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

  if (Object.keys(galat).length > 0) throw GalatApi.validasi(galat);

  const jurusanAktif = await muatJurusanAktif();
  const idJurusan = (kode: unknown) => jurusanAktif.find((j) => j.kode === kode)?.id;
  const jurusan1 = idJurusan(hasil.jurusan_1);
  if (!jurusan1) throw GalatApi.validasi({ jurusan_1: ["Pilihan jurusan tidak valid."] });
  const jurusan2 = hasil.jurusan_2 ? idJurusan(hasil.jurusan_2) : undefined;

  const { kolom, kustom } = susunKolom(hasil);
  const periode = konteks.konfig.tahunAjaran;
  const tahun = periode.split("/")[0];

  const baru = await prisma.$transaction(async (tx) => {
    const nomor = await nomorBerikut(tx, tahun);
    // Input luring ikut gelombang berjalan dan tidak diblokir kuota (keputusan panitia).
    const gelombangId = await tetapkanGelombang(tx, periode, { blokir: false });
    return tx.pendaftar.create({
      data: {
        nomorPendaftaran: nomor,
        gelombangId,
        aksesTokenHash: hashToken(randomBytes(32).toString("hex")),
        periode,
        sumber: "luring",
        // Semua pendaftar langsung diterima (PRD 1.3 butir 62); panitia yang memasukkan data luring tetap dicatat.
        statusVerifikasi: "approved",
        diverifikasiOlehId: BigInt(ctx.userId),
        diverifikasiAt: new Date(),
        namaLengkap: String(hasil.nama_lengkap),
        ...kolom,
        // Nilai rapor tidak lagi diisi dan tes minat bakat hanya di wizard daring (PRD 1.3 butir 65).
        nilaiRapor: {},
        nilaiRaporSumber: "",
        rekomendasiSkor: [],
        rekomendasiVersi: VERSI_MINAT,
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
    dataBaru: { nomor: baru.nomorPendaftaran, nama: baru.namaLengkap, status: "approved" },
    ip: ctx.ip,
  });
  return { id: baru.id.toString(), nomor: baru.nomorPendaftaran };
}
