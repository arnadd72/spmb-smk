import { prisma } from "@/server/db/client";
import {
  TOTAL_LANGKAH,
  type NilaiRapor,
  type InputCekStatus,
} from "@/server/validasi/wizard";
import {
  bacaBerkas,
  bacaData,
  bersihkanBerkas,
  bungkusData,
  konteksValidasi,
  pastikanPendaftaranBuka,
  semuaBerkas,
  validasiLangkah,
  wajibDraf,
  type Berkas,
  type BerkasDraf,
} from "@/server/services/draf";
import { buatTokenAcak, dekripsi, enkripsi, hashPencarian, hashToken } from "@/server/services/kripto";
import { penyimpananDokumen, penyimpananTemp } from "@/server/services/penyimpanan";
import { hitungRekomendasi, muatBobotJurusan } from "@/server/services/rekomendasi";
import { GalatApi } from "@/server/types/galat";

// Submit pendaftaran (PRD v3.1 10.5-10.7), halaman sukses, dan cek status (10.9).

const AWALAN_NOMOR = "SPMB";

/** Kolom Pendaftar yang boleh diisi dari field formulir. Kunci lain (kustom_*) masuk dataKustom. */
const KOLOM_DIKENAL = new Set([
  "nama_lengkap", "tempat_lahir", "tanggal_lahir", "nisn", "nik", "no_kk", "jenis_kelamin", "agama", "anak_ke",
  "jumlah_saudara", "asal_sekolah", "tamat_tahun", "no_ijazah", "no_hp", "no_wa", "email", "alamat", "rt", "rw",
  "desa", "kecamatan", "kabupaten", "propinsi", "nama_ayah", "ayah_ttl", "ayah_pendidikan", "pekerjaan_ayah",
  "nama_ibu", "ibu_ttl", "ibu_pendidikan", "pekerjaan_ibu", "alamat_ortu", "ortu_rt", "ortu_rw", "ortu_desa",
  "ortu_kecamatan", "ortu_kabupaten", "ortu_propinsi", "no_hp_ortu", "penghasilan", "referensi_pendaftar",
  "smp_kecamatan", "smp_kabupaten", "smp_propinsi", "ijazah_nomor_tahun", "lama_belajar", "nilai_ujian",
  "golongan_darah", "tinggi_badan", "berat_badan", "penyakit_pernah_diderita", "hobi_olahraga", "hobi_kesenian",
  "hobi_organisasi", "hobi_prestasi", "hobi_lain", "ukuran_seragam",
]);
const KOLOM_TERENKRIPSI = new Set(["nik", "no_kk", "no_hp", "no_wa", "no_hp_ortu"]);
/** Field yang tidak masuk kolom: ditangani terpisah. */
const KUNCI_DILEWATI = new Set(["setuju", "konfirmasi_final", "jurusan_1", "jurusan_2", "nilai_rapor"]);

const camel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

export type HasilKirim = { nomor: string; aksesToken: string };

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

  // 2. Hitung ulang rekomendasi di server.
  const bobot = await muatBobotJurusan();
  const rapor = semua.nilai_rapor as NilaiRapor;
  const rekom = hitungRekomendasi(rapor, bobot);
  const idJurusan = (kode: unknown) => bobot.find((j) => j.kode === kode)?.id;
  const jurusan1 = idJurusan(semua.jurusan_1);
  if (!jurusan1) throw GalatApi.validasi({ jurusan_1: ["Pilihan jurusan tidak valid."] });
  const jurusan2 = semua.jurusan_2 ? idJurusan(semua.jurusan_2) : undefined;
  const terbaik = rekom.peringkat.find((p) => p.label === "Paling Sesuai");

  // 3. Susun kolom.
  const kolom: Record<string, unknown> = {};
  const kustom: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(semua)) {
    if (KUNCI_DILEWATI.has(k) || v === undefined) continue;
    if (!KOLOM_DIKENAL.has(k)) {
      kustom[k] = v;
      continue;
    }
    if (k === "tanggal_lahir") kolom[camel(k)] = new Date(`${v}T00:00:00Z`);
    else if (KOLOM_TERENKRIPSI.has(k)) kolom[camel(k)] = enkripsi(String(v));
    else kolom[camel(k)] = typeof v === "number" || typeof v === "object" ? v : String(v);
  }
  if (typeof semua.nik === "string") kolom.nikHash = hashPencarian(semua.nik);

  const tahun = konfig.tahunAjaran.split("/")[0];
  const aksesToken = buatTokenAcak(40);

  // 4-5. Transaksi: kunci draf, buat nomor, simpan pendaftar, tandai draf terkirim.
  const hasil = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "PendaftaranDraft" WHERE id = ${baris.id} FOR UPDATE`;
    const segar = await tx.pendaftaranDraft.findUnique({ where: { id: baris.id } });
    const ulang = segar && hasilTersimpan(segar);
    if (ulang) return { ...ulang, baru: false as const };

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"nomor_" + tahun}))`;
    const awalan = `${AWALAN_NOMOR}-${tahun}-`;
    const maks = await tx.$queryRaw<{ n: number }[]>`
      SELECT COALESCE(MAX(CAST(RIGHT("nomorPendaftaran", 4) AS INTEGER)), 0)::int AS n
      FROM "Pendaftar" WHERE "nomorPendaftaran" LIKE ${awalan + "%"}`;
    const nomor = `${awalan}${String((maks[0]?.n ?? 0) + 1).padStart(4, "0")}`;

    await tx.pendaftar.create({
      data: {
        nomorPendaftaran: nomor,
        aksesTokenHash: hashToken(aksesToken),
        periode: konfig.tahunAjaran,
        namaLengkap: String(semua.nama_lengkap),
        ...kolom,
        nilaiRapor: JSON.parse(JSON.stringify(rapor)),
        nilaiRaporSumber: "manual",
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
    await pindahkanKeDrive(hasil.nomor, String(semua.nama_lengkap), konfig.tahunAjaran, berkas).catch((e) =>
      console.error("[submit] sinkron Drive ditunda:", e instanceof Error ? e.message : "tidak diketahui"),
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

/** Pindahkan berkas dari penyimpanan sementara ke Drive: SPMB/{periode}/{nomor} - {NAMA}/ (PRD v4 7.4). */
export async function pindahkanKeDrive(nomor: string, nama: string, periode: string, berkas: BerkasDraf): Promise<void> {
  const daftar = semuaBerkas(berkas);
  if (daftar.length === 0) {
    await prisma.pendaftar.update({ where: { nomorPendaftaran: nomor }, data: { berkasSinkron: "selesai" } });
    return;
  }

  const drive = await penyimpananDokumen(); // melempar bila Drive belum dihubungkan
  const temp = penyimpananTemp();
  const folder = `${periode.replace("/", "-")}/${nomor} - ${namaAman(nama)}`;

  const idDrive: Record<string, string | string[]> = {};
  const unggah = async (kunci: string, b: Berkas, i: number) => {
    const potongan: Buffer[] = [];
    for await (const p of await temp.ambilStream(b.ref)) potongan.push(Buffer.from(p));
    const ext = b.ref.split(".").pop();
    return drive.simpan(`${folder}/${kunci}${i > 0 ? `-${i + 1}` : ""}.${ext}`, Buffer.concat(potongan), b.mime);
  };

  for (const [kunci, nilai] of Object.entries(berkas)) {
    if (!nilai) continue;
    if (Array.isArray(nilai)) idDrive[kunci] = await Promise.all(nilai.map((b, i) => unggah(kunci, b, i)));
    else idDrive[kunci] = await unggah(kunci, nilai, 0);
  }

  await prisma.pendaftar.update({
    where: { nomorPendaftaran: nomor },
    data: {
      aktaFileId: (idDrive.akta as string | undefined) ?? null,
      kkFileId: (idDrive.kk as string | undefined) ?? null,
      raporFileIds: idDrive.rapor ?? undefined,
      berkasSinkron: "selesai",
    },
  });
  await bersihkanBerkas(berkas);
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
  dikirimPada: Date;
};

export async function ambilRingkasanSukses(aksesToken: string): Promise<RingkasanSukses | null> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(aksesToken)) return null;
  const p = await prisma.pendaftar.findUnique({
    where: { aksesTokenHash: hashToken(aksesToken) },
    include: { jurusan1: true, jurusan2: true, rekomendasi: true },
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
