import { daftarGelombang, keadaanDariGelombang, pesanTutup, type KeadaanPendaftaran } from "@/server/services/gelombang";
import { prisma } from "@/server/db/client";
import { buatTokenAcak, dekripsi, enkripsi, hashToken } from "@/server/services/kripto";
import { pastikanKuotaTersedia, terdaftarPerJurusan } from "@/server/services/kuota";
import { ambilPengaturan } from "@/server/services/pengaturan";
import { penyimpananTemp } from "@/server/services/penyimpanan";
import { hitungRekomendasi, muatJurusanAktif, type HasilRekomendasi } from "@/server/services/rekomendasi";
import { GalatApi } from "@/server/types/galat";
import { KUNCI_INTI, KUNCI_WAJIB } from "@/server/validasi/formField";
import { skemaJawabanMinat, type JawabanMinat } from "@/server/validasi/minat";
import { bersihkanIsianOcr } from "@/server/validasi/ocr";
import { KUNCI_FILE_KHUSUS, TOTAL_LANGKAH, skemaLangkah, skemaNilaiUjian, type DefinisiField } from "@/server/validasi/wizard";

// Draf pendaftaran tanpa login (PRD v3.1 10.4, v4 7.4): token acak di cookie httpOnly, hash SHA-256 di database.
// Isian disimpan terenkripsi (AES-GCM) dalam satu blob; berkas sementara lewat PenyimpananDokumen.

export const NAMA_COOKIE_DRAF = "spmb_draft";
export const MASA_DRAF_HARI = 7;
export const MAKS_UKURAN_BYTE = 5 * 1024 * 1024;

export function opsiCookieDraf() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MASA_DRAF_HARI * 24 * 3600,
  };
}

export type Berkas = { ref: string; nama: string; mime: string; ukuran: number };
export type BerkasDraf = Record<string, Berkas | Berkas[] | undefined>;
/** Isian per langkah: { "1": {...}, "5": {...} }. Kunci "_hasil" menyimpan hasil submit (nomor + token akses). */
export type DataDraf = Record<string, Record<string, unknown>>;

// ------------------------------------------------------------------ konfigurasi

export type KonfigWizard = {
  tahunAjaran: string;
  buka: string | null;
  tutup: string | null;
  status: "buka" | "belum" | "tutup";
  /** Gelombang pendaftaran (butir 44): keadaan dihitung dari tabel Gelombang; kosong = aturan lama dari Pengaturan. */
  keadaan: KeadaanPendaftaran;
  kontak: string;
  persyaratan: string;
  persetujuan: string;
  waGroup: string;
};

const wibSekarang = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

/** Tahun ajaran bawaan bila pengaturan belum diisi: mulai tahun ajaran baru pada bulan Oktober. */
function tahunAjaranBawaan(): string {
  const [t, b] = wibSekarang().split("-").map(Number);
  const awal = b >= 10 ? t + 1 : t;
  return `${awal}/${awal + 1}`;
}

export async function ambilKonfigWizard(): Promise<KonfigWizard> {
  const [tahun, buka, tutup, kontak, persyaratan, persetujuan, waGroup] = await Promise.all([
    ambilPengaturan("tahun_ajaran"),
    ambilPengaturan("gelombang_buka"),
    ambilPengaturan("gelombang_tutup"),
    ambilPengaturan("kontak_panitia"),
    ambilPengaturan("teks_persyaratan"),
    ambilPengaturan("teks_persetujuan"),
    ambilPengaturan("wa_group_url"),
  ]);
  const hari = wibSekarang();
  const tahunAjaran = tahun ?? tahunAjaranBawaan();
  const keadaan = keadaanDariGelombang(await daftarGelombang(tahunAjaran));
  const status = keadaan.adaGelombang ? keadaan.status : buka && hari < buka ? "belum" : tutup && hari > tutup ? "tutup" : "buka";

  return {
    tahunAjaran,
    buka: keadaan.adaGelombang ? (keadaan.saatIni?.buka ?? null) : buka || null,
    tutup: keadaan.adaGelombang ? (keadaan.saatIni?.tutup ?? null) : tutup || null,
    status,
    keadaan,
    kontak: kontak ?? "",
    persyaratan: persyaratan ?? "",
    persetujuan: persetujuan ?? "",
    waGroup: waGroup ?? "",
  };
}

export async function pastikanPendaftaranBuka(): Promise<KonfigWizard> {
  const k = await ambilKonfigWizard();
  if (k.keadaan.adaGelombang && k.status !== "buka") throw pesanTutup(k.keadaan);
  if (k.status === "belum") throw new GalatApi(403, "PENDAFTARAN_BELUM_BUKA", `Pendaftaran dibuka pada ${k.buka}.`);
  if (k.status === "tutup") throw new GalatApi(403, "PENDAFTARAN_TUTUP", "Pendaftaran sudah ditutup.");
  return k;
}

/** Definisi field yang tampil, dengan opsi dinamis (jurusan aktif) sudah diselesaikan. */
export async function muatDefinisiField(): Promise<DefinisiField[]> {
  const [baris, jurusan] = await Promise.all([
    prisma.formField.findMany({
      where: { OR: [{ tampil: true }, { kunci: { in: [...KUNCI_INTI] } }] },
      orderBy: [{ langkah: "asc" }, { urutan: "asc" }],
    }),
    prisma.jurusan.findMany({ where: { isActive: true }, orderBy: { urutan: "asc" } }),
  ]);
  const opsiJurusan = jurusan.map((j) => ({ nilai: j.kode, label: `${j.kode} · ${j.nama}` }));

  return baris.map((f) => {
    const mentah = f.opsi as unknown;
    const dinamis = mentah && !Array.isArray(mentah) && (mentah as { dinamis?: string }).dinamis === "jurusan";
    return {
      kunci: f.kunci,
      langkah: f.langkah,
      label: f.label,
      tipe: f.tipe as DefinisiField["tipe"],
      // Isian inti selalu tampil dan wajib walau tabel diubah langsung.
      wajib: f.wajib || KUNCI_INTI.has(f.kunci) || KUNCI_WAJIB.has(f.kunci),
      teksBantuan: f.teksBantuan,
      placeholder: f.placeholder,
      urutan: f.urutan,
      opsi: dinamis ? opsiJurusan : Array.isArray(mentah) ? (mentah as DefinisiField["opsi"]) : null,
    };
  });
}

// ------------------------------------------------------------------ draf

type BarisDraf = NonNullable<Awaited<ReturnType<typeof cariBaris>>>;

async function cariBaris(token: string | undefined) {
  if (!token) return null;
  const baris = await prisma.pendaftaranDraft.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!baris || baris.expiresAt < new Date()) return null;
  return baris;
}

async function wajibDraf(token: string | undefined): Promise<BarisDraf> {
  const baris = await cariBaris(token);
  if (!baris) throw new GalatApi(404, "DRAFT_NOT_FOUND", "Draf tidak ditemukan atau sudah kedaluwarsa. Silakan mulai ulang.");
  return baris;
}

function bacaData(baris: BarisDraf): DataDraf {
  const mentah = baris.data as { v?: string } | null;
  if (!mentah?.v) return {};
  const data = JSON.parse(dekripsi(mentah.v)) as DataDraf;
  const pilihan = data["4"];
  if (pilihan) {
    for (const kunci of ["jurusan_1", "jurusan_2"]) {
      if (pilihan[kunci] === "FKK") pilihan[kunci] = "LPK3";
    }
  }
  return data;
}

const bungkusData = (d: DataDraf) => ({ v: enkripsi(JSON.stringify(d)) });
const bacaBerkas = (baris: BarisDraf) => (baris.berkas ?? {}) as BerkasDraf;

export async function buatDraf(ip?: string, userAgent?: string): Promise<{ token: string }> {
  await pastikanPendaftaranBuka();
  const token = buatTokenAcak(40);
  await prisma.pendaftaranDraft.create({
    data: {
      tokenHash: hashToken(token),
      data: bungkusData({}),
      berkas: {},
      ip,
      userAgent: userAgent?.slice(0, 255),
      expiresAt: new Date(Date.now() + MASA_DRAF_HARI * 24 * 3600_000),
    },
  });
  return { token };
}

export type TampilanDraf = {
  langkahTerakhir: number;
  data: DataDraf;
  berkas: BerkasDraf;
  sudahKirim: boolean;
};

/** Data draf untuk mengisi ulang form. Null bila token kosong atau draf tak ada. */
export async function ambilDraf(token: string | undefined): Promise<TampilanDraf | null> {
  const baris = await cariBaris(token);
  if (!baris) return null;
  const data = bacaData(baris);
  delete (data as Record<string, unknown>)._hasil;
  return { langkahTerakhir: baris.langkahTerakhir, data, berkas: bacaBerkas(baris), sudahKirim: Boolean(baris.submittedAt) };
}

export async function hapusDraf(token: string | undefined): Promise<void> {
  const baris = await cariBaris(token);
  if (!baris || baris.submittedAt) return;
  await bersihkanBerkas(bacaBerkas(baris));
  await prisma.pendaftaranDraft.delete({ where: { id: baris.id } });
}

function semuaBerkas(b: BerkasDraf): Berkas[] {
  return Object.values(b).flatMap((v) => (Array.isArray(v) ? v : v ? [v] : []));
}

async function bersihkanBerkas(b: BerkasDraf) {
  const temp = penyimpananTemp();
  await Promise.all(semuaBerkas(b).map((f) => temp.hapus(f.ref).catch(() => undefined)));
}

// ------------------------------------------------------------------ berkas

export function deteksiMime(isi: Buffer): { mime: string; ext: string } | null {
  if (isi.length < 12) return null;
  if (isi[0] === 0xff && isi[1] === 0xd8 && isi[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (isi.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (isi.subarray(0, 4).toString("latin1") === "RIFF" && isi.subarray(8, 12).toString("latin1") === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (isi.subarray(0, 4).toString("latin1") === "%PDF") return { mime: "application/pdf", ext: "pdf" };
  return null;
}

function bersihNama(nama: string): string {
  return nama.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "berkas";
}

/** Kunci berkas yang boleh diunggah: akta, kk, atau field file kustom (rapor tidak pernah diunggah). */
function kunciBerkasSah(kunci: string, fields: DefinisiField[]): boolean {
  return (KUNCI_FILE_KHUSUS as readonly string[]).includes(kunci) || fields.some((f) => f.kunci === kunci && f.tipe === "file");
}

export async function unggahBerkas(token: string | undefined, kunci: string, isi: Buffer, namaAsli: string): Promise<Berkas> {
  const baris = await wajibDraf(token);
  if (baris.submittedAt) throw new GalatApi(409, "ALREADY_SUBMITTED", "Pendaftaran sudah dikirim.");
  if (!kunciBerkasSah(kunci, await muatDefinisiField())) throw GalatApi.validasi({ berkas: ["Jenis berkas tidak dikenal."] });
  if (isi.length === 0) throw GalatApi.validasi({ berkas: ["Berkas kosong."] });
  if (isi.length > MAKS_UKURAN_BYTE) throw GalatApi.validasi({ berkas: ["Ukuran berkas melebihi 5 MB."] });
  const jenis = deteksiMime(isi);
  if (!jenis) throw GalatApi.validasi({ berkas: ["Format berkas harus JPG, PNG, WebP, atau PDF."] });
  if (kunci === "pas_foto" && !jenis.mime.startsWith("image/")) throw GalatApi.validasi({ berkas: ["Pas foto harus berupa gambar JPG, PNG, atau WebP."] });

  const berkas = bacaBerkas(baris);
  const lama = berkas[kunci];

  const temp = penyimpananTemp();
  const ref = await temp.simpan(`${baris.id}/${kunci}-${buatTokenAcak(8)}.${jenis.ext}`, isi, jenis.mime);
  const baru: Berkas = { ref, nama: bersihNama(namaAsli), mime: jenis.mime, ukuran: isi.length };

  // Satu-slot: berkas lama diganti dan dihapus dari penyimpanan.
  if (lama && !Array.isArray(lama)) await temp.hapus(lama.ref).catch(() => undefined);
  berkas[kunci] = baru;

  await prisma.pendaftaranDraft.update({ where: { id: baris.id }, data: { berkas: JSON.parse(JSON.stringify(berkas)) } });
  return baru;
}

export async function hapusBerkas(token: string | undefined, kunci: string, ref: string): Promise<void> {
  const baris = await wajibDraf(token);
  if (baris.submittedAt) throw new GalatApi(409, "ALREADY_SUBMITTED", "Pendaftaran sudah dikirim.");
  const berkas = bacaBerkas(baris);
  const nilai = berkas[kunci];
  const daftar = Array.isArray(nilai) ? nilai : nilai ? [nilai] : [];
  if (!daftar.some((b) => b.ref === ref)) throw GalatApi.tidakDitemukan("Berkas tidak ditemukan.");

  await penyimpananTemp().hapus(ref).catch(() => undefined);
  const sisa = daftar.filter((b) => b.ref !== ref);
  berkas[kunci] = Array.isArray(nilai) ? sisa : undefined;
  if (berkas[kunci] === undefined) delete berkas[kunci];
  await prisma.pendaftaranDraft.update({ where: { id: baris.id }, data: { berkas: JSON.parse(JSON.stringify(berkas)) } });
}

// ------------------------------------------------------------------ langkah

export type KonteksValidasi = { fields: DefinisiField[] };

/**
 * Validasi isian satu langkah terhadap field (form builder) dan aturan khusus. Mengembalikan data bersih.
 * Dipakai saat menyimpan langkah dan, untuk semua langkah, saat submit.
 */
export function validasiLangkah(langkah: number, input: unknown, berkas: BerkasDraf, k: KonteksValidasi): Record<string, unknown> {
  const mentah = (input ?? {}) as Record<string, unknown>;
  const hasil: Record<string, unknown> = {};
  const galat: Record<string, string[]> = {};

  const biasa = skemaLangkah(k.fields, langkah).safeParse(mentah);
  if (biasa.success) Object.assign(hasil, biasa.data);
  else for (const i of biasa.error.issues) (galat[i.path.join(".") || "_"] ??= []).push(i.message);

  // Berkas (langkah 2 dan 3, plus field file kustom di langkah mana pun)
  for (const f of k.fields.filter((x) => x.langkah === langkah && x.tipe === "file")) {
    const b = berkas[f.kunci];
    const ada = Array.isArray(b) ? b.length > 0 : Boolean(b);
    if (f.wajib && !ada) (galat[f.kunci] ??= []).push(`${f.label} wajib diunggah.`);
  }

  // Tes minat bakat (langkah 3, opsional; PRD 1.3 butir 65): satu indeks pilihan atau null per soal.
  if (langkah === 3) {
    const m = skemaJawabanMinat.safeParse(mentah.minat ?? []);
    if (m.success) hasil.minat = m.data;
    else (galat.minat ??= []).push(m.error.issues[0]?.message ?? "Jawaban tes tidak valid.");
  }

  // Saran isian dari OCR Akta dan KK (langkah 2): hanya prapengisian langkah 5 dan 6, disaring ulang di sini.
  if (langkah === 2) {
    const ocr = bersihkanIsianOcr(mentah.ocr);
    if (Object.keys(ocr).length > 0) hasil.ocr = ocr;
  }

  // Tabel nilai ujian (langkah 7)
  const defUjian = k.fields.find((f) => f.kunci === "nilai_ujian" && f.langkah === langkah);
  if (defUjian) {
    const u = skemaNilaiUjian().safeParse(mentah.nilai_ujian ?? {});
    if (u.success) hasil.nilai_ujian = u.data;
    else for (const i of u.error.issues) (galat[`nilai_ujian.${i.path.join(".")}`] ??= []).push(i.message);
  }

  if (Object.keys(galat).length > 0) throw GalatApi.validasi(galat);
  return hasil;
}

export async function konteksValidasi(): Promise<KonteksValidasi & { konfig: KonfigWizard }> {
  const [fields, konfig] = await Promise.all([muatDefinisiField(), ambilKonfigWizard()]);
  return { fields, konfig };
}

export async function simpanLangkah(token: string | undefined, langkah: number, input: unknown): Promise<{ langkahTerakhir: number }> {
  if (!Number.isInteger(langkah) || langkah < 1 || langkah >= TOTAL_LANGKAH) {
    throw GalatApi.validasi({ langkah: ["Langkah tidak valid."] });
  }
  const baris = await wajibDraf(token);
  if (baris.submittedAt) throw new GalatApi(409, "ALREADY_SUBMITTED", "Pendaftaran sudah dikirim.");
  if (langkah > baris.langkahTerakhir) {
    throw new GalatApi(409, "STEP_LOCKED", "Selesaikan langkah sebelumnya terlebih dahulu.");
  }
  await pastikanPendaftaranBuka();

  const ctx = await konteksValidasi();
  const bersih = validasiLangkah(langkah, input, bacaBerkas(baris), ctx);
  // Jurusan yang kuotanya penuh tidak bisa dipilih (PRD 1.3 butir 62).
  if (typeof bersih.jurusan_1 === "string") {
    const j = await prisma.jurusan.findUnique({ where: { kode: bersih.jurusan_1 }, select: { id: true } });
    if (j) await pastikanKuotaTersedia(prisma, ctx.konfig.tahunAjaran, j.id);
  }

  const data = bacaData(baris);
  data[String(langkah)] = bersih;
  const terakhir = Math.max(baris.langkahTerakhir, langkah + 1);
  await prisma.pendaftaranDraft.update({
    where: { id: baris.id },
    data: { data: bungkusData(data), langkahTerakhir: terakhir },
  });
  return { langkahTerakhir: terakhir };
}

// ------------------------------------------------------------------ rekomendasi

export async function rekomendasiDraf(token: string | undefined): Promise<HasilRekomendasi & { kuotaPenuh: string[] }> {
  const baris = await wajibDraf(token);
  const hasil = hitungRekomendasi(bacaData(baris)["3"]?.minat as JawabanMinat | undefined, await muatJurusanAktif());

  // Info kuota (tidak memblokir, PRD 10.4 langkah 4): jurusan dengan pendaftar >= kuota.
  const jurusan = await prisma.jurusan.findMany({ where: { isActive: true }, select: { id: true, kode: true, kuota: true } });
  const terpakai = await terdaftarPerJurusan((await ambilKonfigWizard()).tahunAjaran);
  const kuotaPenuh = jurusan.filter((j) => (terpakai.get(String(j.id)) ?? 0) >= j.kuota).map((j) => j.kode);

  return { ...hasil, kuotaPenuh };
}

export { bacaData, bungkusData, bacaBerkas, wajibDraf, bersihkanBerkas, semuaBerkas };
export type { BarisDraf };
