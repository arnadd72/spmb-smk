import { tetapkanGelombang } from "@/server/services/gelombang";
import { prisma } from "@/server/db/client";
import type { JawabanMinat } from "@/server/validasi/minat";
import { TOTAL_LANGKAH, type InputCekStatus } from "@/server/validasi/wizard";
import {
  bacaBerkas,
  bacaData,
  bungkusData,
  konteksValidasi,
  pastikanPendaftaranBuka,
  validasiLangkah,
  wajibDraf,
  type Berkas,
  type BerkasDraf,
} from "@/server/services/draf";
import { buatTokenAcak, dekripsi, enkripsi, hashToken } from "@/server/services/kripto";
import { pastikanKuotaTersedia } from "@/server/services/kuota";
import { kirimKodePendaftaran } from "@/server/services/notifikasi";
import { susunKolom } from "@/server/services/pendaftarKolom";
import { pastikanNisnBelumTerdaftar } from "@/server/services/pendaftarGanda";
import { penyimpananDokumen, penyimpananTemp, type PenyimpananDokumen } from "@/server/services/penyimpanan";
import { statusDrive } from "@/server/services/penyimpanan/driveOAuth";
import { hitungRekomendasi, muatJurusanAktif } from "@/server/services/rekomendasi";
import { GalatApi } from "@/server/types/galat";

// Submit pendaftaran (PRD v3.1 10.5-10.7), halaman sukses, dan cek status (10.9).

const AWALAN_NOMOR = "SPMB";

export type HasilKirim = { nomor: string; aksesToken: string };

type Transaksi = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Nomor pendaftaran berikutnya `SPMB-{TAHUN}-{NNNN}`, dikunci advisory lock per tahun agar tidak bentrok. Dipakai wizard dan input manual. */
export async function nomorBerikut(tx: Transaksi, tahun: string): Promise<string> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"nomor_" + tahun}))`;
  const awalan = `${AWALAN_NOMOR}-${tahun}-`;
  const maks = await tx.$queryRaw<{ n: number }[]>`
    SELECT COALESCE(MAX(CAST(RIGHT("nomorPendaftaran", 4) AS INTEGER)), 0)::int AS n
    FROM "Pendaftar" WHERE "nomorPendaftaran" LIKE ${awalan + "%"}`;
  return `${awalan}${String((maks[0]?.n ?? 0) + 1).padStart(4, "0")}`;
}

export async function kirimPendaftaran(token: string | undefined, konfirmasiFinal: unknown): Promise<HasilKirim> {
  const baris = await wajibDraf(token);
  const sebelumnya = hasilTersimpan(baris);
  if (sebelumnya) return sebelumnya; // klik ganda atau kirim ulang: hasil yang sama, tidak membuat pendaftar baru

  if (konfirmasiFinal !== true) throw GalatApi.validasi({ konfirmasi_final: ["Anda harus menyatakan data yang diisi benar."] });
  const konfig = await pastikanPendaftaranBuka();
  if (baris.langkahTerakhir < TOTAL_LANGKAH) {
    throw new GalatApi(409, "STEP_LOCKED", "Lengkapi semua langkah sebelum mengirim.");
  }

  // 1. Validasi ulang seluruh draf terhadap form builder saat ini.
  const ctx = await konteksValidasi();
  const berkas = bacaBerkas(baris);
  const data = bacaData(baris);
  const semua: Record<string, unknown> = {};
  for (let n = 1; n < TOTAL_LANGKAH; n++) {
    try {
      Object.assign(semua, validasiLangkah(n, data[String(n)] ?? {}, berkas, ctx));
    } catch (e) {
      if (e instanceof GalatApi) throw new GalatApi(409, "STEP_INVALID", `Isian langkah ${n} belum lengkap atau tidak valid. Periksa kembali.`, e.errors);
      throw e;
    }
  }

  // 2. Hitung ulang rekomendasi dari jawaban tes minat bakat di server.
  const jurusanAktif = await muatJurusanAktif();
  const rekom = hitungRekomendasi(semua.minat as JawabanMinat | undefined, jurusanAktif);
  const idJurusan = (kode: unknown) => jurusanAktif.find((j) => j.kode === kode)?.id;
  const jurusan1 = idJurusan(semua.jurusan_1);
  if (!jurusan1) throw GalatApi.validasi({ jurusan_1: ["Pilihan jurusan tidak valid."] });
  const jurusan2 = semua.jurusan_2 ? idJurusan(semua.jurusan_2) : undefined;
  const terbaik = rekom.peringkat.find((p) => p.label === "Paling Sesuai");

  // 3. Susun kolom (dipakai juga oleh edit admin dan input manual).
  const { kolom, kustom } = susunKolom(semua);

  const tahun = konfig.tahunAjaran.split("/")[0];
  const aksesToken = buatTokenAcak(40);

  // 4-5. Transaksi: kunci draf, buat nomor, simpan pendaftar, tandai draf terkirim.
  const hasil = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "PendaftaranDraft" WHERE id = ${baris.id} FOR UPDATE`;
    const segar = await tx.pendaftaranDraft.findUnique({ where: { id: baris.id } });
    const ulang = segar && hasilTersimpan(segar);
    if (ulang) return { ...ulang, baru: false as const };

    const nomor = await nomorBerikut(tx, tahun);
    // Kunci advisory nomor sudah dipegang: dua pendaftaran ber-NISN sama yang dikirim bersamaan tidak lolos keduanya (poin E).
    await pastikanNisnBelumTerdaftar(semua.nisn, { klien: tx });
    // Kunci advisory nomor sudah dipegang: hitung kuota gelombang aman dari kirim bersamaan.
    const gelombangId = await tetapkanGelombang(tx, konfig.tahunAjaran, { blokir: true });
    // Pendaftar langsung diterima, jadi kuota jurusan ditegakkan di sini, di bawah kunci yang sama (PRD 1.3 butir 62).
    await pastikanKuotaTersedia(tx, konfig.tahunAjaran, BigInt(jurusan1));

    await tx.pendaftar.create({
      data: {
        nomorPendaftaran: nomor,
        // Langsung diterima, tanpa antrean verifikasi panitia (PRD 1.3 butir 62).
        statusVerifikasi: "approved",
        gelombangId,
        aksesTokenHash: hashToken(aksesToken),
        periode: konfig.tahunAjaran,
        namaLengkap: String(semua.nama_lengkap),
        ...kolom,
        // Nilai rapor tidak lagi diisi (PRD 1.3 butir 65); kolom wajib lama diisi kosong.
        nilaiRapor: {},
        nilaiRaporSumber: "",
        rekomendasiJurusanId: terbaik ? BigInt(terbaik.jurusanId) : null,
        rekomendasiSkor: JSON.parse(JSON.stringify(rekom.peringkat)),
        rekomendasiVersi: rekom.versi,
        jurusan1Id: BigInt(jurusan1),
        jurusan2Id: jurusan2 ? BigInt(jurusan2) : null,
        dataKustom: Object.keys(kustom).length > 0 ? JSON.parse(JSON.stringify(kustom)) : undefined,
        berkasMeta: JSON.parse(JSON.stringify(berkas)),
        berkasSinkron: "menunggu",
      },
    });

    const hasilSimpan = { nomor, aksesToken };
    const dataBaru = { ...data, _hasil: { v: enkripsi(JSON.stringify(hasilSimpan)) } };
    await tx.pendaftaranDraft.update({
      where: { id: baris.id },
      data: { submittedAt: new Date(), data: bungkusData(dataBaru as never) },
    });
    return { ...hasilSimpan, baru: true as const };
  });

  // 6. Setelah commit: pindahkan berkas ke Drive. Gagal tidak membatalkan pendaftaran (berkas tetap di temp).
  if (hasil.baru) {
    await pindahkanKeDrive(hasil.nomor).catch((e) =>
      console.error("[submit] sinkron Drive ditunda:", e instanceof Error ? e.message : "tidak diketahui"),
    );
  }
  // 7. Email kode pendaftaran (bila mengisi email). Gagal kirim tidak menggagalkan pendaftaran; cron harian mengulang.
  if (hasil.baru) {
    await kirimKodePendaftaran(hasil.nomor, hasil.aksesToken).catch((e) =>
      console.error("[submit] email ditunda:", e instanceof Error ? e.message : "tidak diketahui"),
    );
  }
  return { nomor: hasil.nomor, aksesToken: hasil.aksesToken };
}

function hasilTersimpan(baris: { submittedAt: Date | null; data: unknown }): HasilKirim | null {
  if (!baris.submittedAt) return null;
  const v = (baris.data as { v?: string } | null)?.v;
  if (!v) return null;
  const h = (JSON.parse(dekripsi(v)) as { _hasil?: { v: string } })._hasil;
  return h ? (JSON.parse(dekripsi(h.v)) as HasilKirim) : null;
}

const namaAman = (s: string) => s.replace(/[\\/:*?"<>|]/g, "").trim().toUpperCase().slice(0, 60);

type BarisDrive = { aktaFileId: string | null; kkFileId: string | null; raporFileIds: unknown; kustomFileIds: unknown };

/** Semua ID Drive milik pendaftar (akta, KK, rapor, berkas kustom), berurutan; kosong bila belum ada satu pun di Drive. */
export function semuaIdDrive(p: BarisDrive): string[] {
  const kustom = Object.values((p.kustomFileIds ?? {}) as Record<string, string | string[]>).flat();
  const rapor = Array.isArray(p.raporFileIds) ? (p.raporFileIds as (string | null)[]) : [];
  return [p.aktaFileId, p.kkFileId, ...rapor, ...kustom].filter((id): id is string => typeof id === "string" && id !== "");
}

/** ID Drive pertama milik pendaftar (berkas apa pun), atau null bila belum ada satu pun di Drive. */
export function idDrivePertama(p: BarisDrive): string | null {
  return semuaIdDrive(p)[0] ?? null;
}

/** Samakan nama folder pendaftar di Drive dengan nama sekarang. Tidak berbuat apa-apa bila belum ada berkas di Drive. */
async function selarasNamaFolder(p: BarisDrive & { nomorPendaftaran: string; namaLengkap: string }, drive: PenyimpananDokumen): Promise<void> {
  const acuan = idDrivePertama(p);
  if (acuan) await drive.gantiNamaFolder(acuan, `${p.nomorPendaftaran} - ${namaAman(p.namaLengkap)}`);
}

/**
 * Dipanggil setelah nama pendaftar berubah. Gagal tidak melempar (perubahan data sudah tersimpan): status berkas jadi
 * "menunggu" supaya sinkron berikutnya, termasuk cron harian, mengulang penggantian nama folder.
 */
export async function selarasFolderDrive(id: bigint): Promise<void> {
  const p = await prisma.pendaftar.findUnique({ where: { id } });
  if (!p || !idDrivePertama(p)) return;
  try {
    if (!(await statusDrive()).terhubung) throw new Error("Google Drive belum terhubung.");
    await selarasNamaFolder(p, await penyimpananDokumen());
  } catch (e) {
    console.error(`[drive] ganti nama folder ${p.nomorPendaftaran} gagal:`, e instanceof Error ? e.message : e);
    if (p.berkasSinkron === "selesai") await prisma.pendaftar.update({ where: { id }, data: { berkasSinkron: "menunggu" } });
  }
}

/**
 * Pindahkan berkas yang belum punya ID Drive dari penyimpanan sementara ke Drive:
 * SPMB/{periode}/pendaftar/{nomor} - {NAMA}/ (PRD v4 7.3). Yang sudah di Drive dilewati, jadi aman dipanggil berulang.
 */
export async function pindahkanKeDrive(nomor: string): Promise<void> {
  const p = await prisma.pendaftar.findUnique({ where: { nomorPendaftaran: nomor } });
  if (!p) throw GalatApi.tidakDitemukan("Pendaftar tidak ditemukan.");
  const meta = (p.berkasMeta ?? {}) as BerkasDraf;

  type Tugas = { kunci: string; i: number; b: Berkas };
  const rapor = Array.isArray(p.raporFileIds) ? (p.raporFileIds as (string | null)[]) : [];
  const kustomId = { ...((p.kustomFileIds ?? {}) as Record<string, string>) };
  const tugas: Tugas[] = [];
  for (const [kunci, nilai] of Object.entries(meta)) {
    if (!nilai) continue;
    if (Array.isArray(nilai)) nilai.forEach((b, i) => !(kunci === "rapor" && rapor[i]) && tugas.push({ kunci, i, b }));
    else if (!(kunci === "akta" && p.aktaFileId) && !(kunci === "kk" && p.kkFileId) && !(kunci !== "akta" && kunci !== "kk" && kustomId[kunci])) {
      tugas.push({ kunci, i: 0, b: nilai });
    }
  }
  if (tugas.length === 0) {
    // Tidak ada yang dipindah, tetapi nama folder mungkin tertinggal dari perubahan nama pendaftar.
    if (idDrivePertama(p)) await selarasNamaFolder(p, await penyimpananDokumen());
    await prisma.pendaftar.update({ where: { id: p.id }, data: { berkasSinkron: "selesai" } });
    return;
  }

  const drive = await penyimpananDokumen(); // melempar bila Drive belum dihubungkan
  await selarasNamaFolder(p, drive); // sebelum menyimpan, agar berkas baru masuk ke folder yang sama
  const temp = penyimpananTemp();
  const folder = `${p.periode.replace("/", "-")}/pendaftar/${nomor} - ${namaAman(p.namaLengkap)}`;

  let akta = p.aktaFileId;
  let kk = p.kkFileId;
  const idRapor = [...rapor];
  const terpindah: Berkas[] = [];
  for (const t of tugas) {
    const potongan: Buffer[] = [];
    for await (const bagian of await temp.ambilStream(t.b.ref)) potongan.push(Buffer.from(bagian));
    const ext = t.b.ref.split(".").pop();
    const id = await drive.simpan(`${folder}/${t.kunci}${t.i > 0 ? `-${t.i + 1}` : ""}.${ext}`, Buffer.concat(potongan), t.b.mime);
    if (t.kunci === "akta") akta = id;
    else if (t.kunci === "kk") kk = id;
    else if (t.kunci === "rapor") idRapor[t.i] = id;
    else kustomId[t.kunci] = id; // isian berkas kustom dari form builder
    terpindah.push(t.b);
  }

  await prisma.pendaftar.update({
    where: { id: p.id },
    data: {
      aktaFileId: akta,
      kkFileId: kk,
      ...(idRapor.length > 0 ? { raporFileIds: idRapor } : {}),
      ...(Object.keys(kustomId).length > 0 ? { kustomFileIds: kustomId } : {}),
      berkasSinkron: "selesai",
    },
  });
  await Promise.all(terpindah.map((b) => temp.hapus(b.ref).catch(() => undefined)));
}

// ------------------------------------------------------------------ halaman sukses

export type RingkasanSukses = {
  nomor: string;
  nama: string;
  nisn: string | null;
  periode: string;
  jurusan1: { kode: string; nama: string } | null;
  jurusan2: { kode: string; nama: string } | null;
  rekomendasi: { kode: string; nama: string } | null;
  gelombang: string | null;
  dikirimPada: Date;
};

export async function ambilRingkasanSukses(aksesToken: string): Promise<RingkasanSukses | null> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(aksesToken)) return null;
  const p = await prisma.pendaftar.findUnique({
    where: { aksesTokenHash: hashToken(aksesToken) },
    include: { jurusan1: true, jurusan2: true, rekomendasi: true, gelombang: true },
  });
  if (!p) return null;
  const ringkas = (j: { kode: string; nama: string } | null) => (j ? { kode: j.kode, nama: j.nama } : null);
  return {
    nomor: p.nomorPendaftaran,
    nama: p.namaLengkap,
    nisn: p.nisn,
    periode: p.periode,
    jurusan1: ringkas(p.jurusan1),
    jurusan2: ringkas(p.jurusan2),
    rekomendasi: ringkas(p.rekomendasi),
    gelombang: p.gelombang?.nama ?? null,
    dikirimPada: p.createdAt,
  };
}

// ------------------------------------------------------------------ cek status

export const BATAS_CEK_PER_MENIT = 10;

export type HasilCekStatus = {
  nomor: string;
  nama: string;
  jurusan1: string | null;
  jurusan2: string | null;
  status: "pending" | "approved" | "revision" | "rejected";
  catatan: string | null;
};

export async function cekStatus(input: InputCekStatus, ip = "tanpa-ip"): Promise<HasilCekStatus> {
  const penanda = `cek:${ip}`;
  const sejak = new Date(Date.now() - 60_000);
  const percobaan = await prisma.percobaanLogin.count({ where: { username: penanda, createdAt: { gte: sejak } } });
  if (percobaan >= BATAS_CEK_PER_MENIT) throw GalatApi.terlaluBanyak("Terlalu banyak pengecekan. Coba lagi satu menit lagi.");
  await prisma.percobaanLogin.create({ data: { username: penanda, ip, berhasil: false } });

  const p = await prisma.pendaftar.findUnique({
    where: { nomorPendaftaran: input.nomor.trim().toUpperCase() },
    include: { jurusan1: true, jurusan2: true },
  });
  // Pesan sama untuk nomor salah dan tanggal salah: tidak membocorkan nomor mana yang ada.
  const cocok = p?.tanggalLahir?.toISOString().slice(0, 10) === input.tanggalLahir;
  if (!p || !cocok) throw new GalatApi(404, "NOT_FOUND", "Nomor pendaftaran atau tanggal lahir tidak cocok.");

  const catatan = p.statusVerifikasi === "rejected" ? p.catatanPenolakan : p.statusVerifikasi === "revision" ? p.catatanVerifikasi : null;
  return {
    nomor: p.nomorPendaftaran,
    nama: p.namaLengkap,
    jurusan1: p.jurusan1 ? `${p.jurusan1.kode} · ${p.jurusan1.nama}` : null,
    jurusan2: p.jurusan2 ? `${p.jurusan2.kode} · ${p.jurusan2.nama}` : null,
    status: p.statusVerifikasi,
    catatan,
  };
}
