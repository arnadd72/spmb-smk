import { z } from "zod";

// Validasi wizard pendaftaran (PRD v3.1 10.4, PRD v4 A4). Modul murni tanpa akses database, dipakai server
// (otoritatif) dan form klien lewat schema-client.ts. Definisi field berasal dari tabel FormField.

export type TipeField =
  | "text"
  | "number"
  | "tel"
  | "email"
  | "date"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "file"
  | "tabel";

export type OpsiField = { nilai: string; label: string };

export type DefinisiField = {
  kunci: string;
  langkah: number;
  label: string;
  tipe: TipeField;
  wajib: boolean;
  teksBantuan?: string | null;
  placeholder?: string | null;
  opsi?: OpsiField[] | null;
  urutan: number;
};

export const TOTAL_LANGKAH = 8;
export const NAMA_LANGKAH = [
  "Persetujuan dan identitas",
  "Akta dan kartu keluarga",
  "Rapor",
  "Rekomendasi dan pilihan jurusan",
  "Data murid",
  "Data orang tua",
  "Sekolah asal, kesehatan, dan seragam",
  "Tinjau dan kirim",
] as const;

/** Field langkah 1 sampai 8 yang ditangani khusus (bukan input teks biasa). */
/** Berkas yang disimpan. Foto rapor sengaja tidak: hanya nilainya yang dibaca di browser dan dipakai (PRD butir 40). */
export const KUNCI_FILE_KHUSUS = ["akta", "kk"] as const;
export const KUNCI_NILAI_UJIAN = ["b_indonesia", "b_inggris", "matematika", "ipa"] as const;

const kosongJadiUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** Tanggal hari ini (WIB) sebagai YYYY-MM-DD, untuk validasi "sebelum hari ini". */
function hariIniWib(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

const tanggal = z
  .string({ error: "Tanggal wajib diisi." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid.")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Tanggal tidak valid.")
  .refine((s) => s < hariIniWib(), "Tanggal harus sebelum hari ini.");

function skemaPerKunci(kunci: string): z.ZodType | null {
  switch (kunci) {
    case "nisn":
      return z.string().regex(/^\d{10}$/, "NISN harus 10 digit angka.");
    case "nik":
    case "nik_ayah":
    case "nik_ibu":
    case "no_kk":
      return z.string().regex(/^\d{16}$/, "Harus 16 digit angka.");
    case "rt":
    case "rw":
    case "ortu_rt":
    case "ortu_rw":
      return z.string().regex(/^\d{1,3}$/, "RT/RW maksimal 3 digit angka.");
    case "lama_belajar":
      return z.string().regex(/^\d$/, "Lama belajar harus 1 digit angka.");
    case "tanggal_lahir":
      return tanggal;
    case "nama_lengkap":
      return z.string().trim().min(3, "Nama minimal 3 huruf.").max(255, "Nama terlalu panjang.");
    case "setuju":
    case "konfirmasi_final":
      return z.literal(true, { error: "Anda harus menyetujui pernyataan ini." });
    default:
      return null;
  }
}

function skemaPerTipe(f: DefinisiField): z.ZodType {
  const opsi = f.opsi?.map((o) => o.nilai) ?? [];
  switch (f.tipe) {
    case "number":
      return z.coerce.number({ error: "Isi dengan angka." }).int("Isi dengan bilangan bulat.").min(0, "Tidak boleh negatif.").max(["tinggi_badan", "berat_badan"].includes(f.kunci) ? 999 : 100000);
    case "tel":
      return z.string().trim().regex(/^[0-9+\-\s]{8,18}$/, "Nomor telepon tidak valid.");
    case "email":
      return z.string().trim().max(255).pipe(z.email("Format email tidak valid."));
    case "date":
      return tanggal;
    case "checkbox":
      return z.boolean();
    case "select":
    case "radio":
      return opsi.length > 0
        ? z.string().refine((v) => opsi.includes(v), "Pilihan tidak valid.")
        : z.string().trim().min(1).max(255);
    case "textarea":
      return z.string().trim().max(1000, "Maksimal 1000 karakter.");
    default:
      return z.string().trim().max(255, "Maksimal 255 karakter.");
  }
}

/** Skema satu field. Field opsional menerima string kosong (dianggap tidak diisi). */
export function skemaField(f: DefinisiField): z.ZodType {
  const dasar = skemaPerKunci(f.kunci) ?? skemaPerTipe(f);
  const dasarField = z.any().transform((v, ctx) => {
    const kosong = v === undefined || v === null || (typeof v === "string" && v.trim() === "");
    if (kosong && f.tipe !== "checkbox") {
      if (f.wajib) ctx.addIssue({ code: "custom", message: `${f.label} wajib diisi.` });
      return undefined;
    }
    if (kosong && !f.wajib) return undefined;
    const hasil = dasar.safeParse(v);
    if (hasil.success) return hasil.data;
    for (const isu of hasil.error.issues) ctx.addIssue({ code: "custom", message: isu.message });
    return z.NEVER;
  });
  // Field opsional boleh tidak dikirim sama sekali (kunci hilang dari JSON), field wajib tetap diperiksa.
  return f.wajib ? dasarField : dasarField.optional();
}

/** Field yang diisi lewat input biasa; file dan tabel ditangani terpisah. */
export function fieldBiasa(fields: DefinisiField[], langkah: number): DefinisiField[] {
  return fields
    .filter((f) => f.langkah === langkah && f.tipe !== "file" && f.tipe !== "tabel")
    .sort((a, b) => a.urutan - b.urutan);
}

/** Skema objek untuk satu langkah. Kunci selain yang terdaftar dibuang (strip) agar data tak liar. */
export function skemaLangkah(fields: DefinisiField[], langkah: number) {
  const bentuk: Record<string, z.ZodType> = {};
  for (const f of fieldBiasa(fields, langkah)) bentuk[f.kunci] = skemaField(f);

  return z.object(bentuk).superRefine((data, ctx) => {
    const d = data as Record<string, unknown>;
    if (langkah === 4 && d.jurusan_2 && d.jurusan_2 === d.jurusan_1) {
      ctx.addIssue({ code: "custom", path: ["jurusan_2"], message: "Pilihan 2 harus berbeda dari pilihan 1." });
    }
  });
}

// ------------------------------------------------------------- nilai rapor

export type NilaiRapor = {
  semester: number[];
  /** kode mapel -> { "1": 82, "2": 84, ... } */
  mapel: Record<string, Record<string, number>>;
};

export function adaNilaiRapor(nilai: NilaiRapor | undefined): nilai is NilaiRapor {
  return Object.values(nilai?.mapel ?? {}).some((semester) => Object.values(semester).some((n) => Number.isFinite(n)));
}

const nilai0sampai100 = z.coerce.number({ error: "Isi dengan angka." }).min(0, "Minimal 0.").max(100, "Maksimal 100.");

export function skemaNilaiRapor(semesterDipakai: number[], mapelWajib: string[]) {
  return z
    .object({
      semester: z.array(z.number().int().min(1).max(6)).default(semesterDipakai),
      mapel: z.record(z.string(), z.record(z.string(), z.preprocess(kosongJadiUndefined, nilai0sampai100.optional()))),
    })
    .transform((v) => {
      // buang sel kosong
      const mapel: NilaiRapor["mapel"] = {};
      for (const [kode, sel] of Object.entries(v.mapel)) {
        const bersih: Record<string, number> = {};
        for (const [sem, n] of Object.entries(sel)) {
          if (typeof n === "number" && semesterDipakai.includes(Number(sem))) bersih[sem] = n;
        }
        if (Object.keys(bersih).length > 0) mapel[kode] = bersih;
      }
      return { semester: semesterDipakai, mapel } satisfies NilaiRapor;
    })
    .superRefine((v, ctx) => {
      for (const kode of mapelWajib) {
        if (!v.mapel[kode]) {
          ctx.addIssue({ code: "custom", path: ["mapel", kode], message: "Isi minimal satu semester." });
        }
      }
    });
}

export function skemaNilaiUjian() {
  return z.object({
    b_indonesia: nilai0sampai100,
    b_inggris: nilai0sampai100,
    matematika: nilai0sampai100,
    ipa: nilai0sampai100,
  });
}

/** Rata-rata nilai satu mapel dari semester yang terisi. */
export function rataMapel(sel: Record<string, number> | undefined): number | null {
  if (!sel) return null;
  const nilai = Object.values(sel);
  return nilai.length === 0 ? null : nilai.reduce((a, b) => a + b, 0) / nilai.length;
}

// ------------------------------------------------------------- cek status

export const skemaCekStatus = z.object({
  nomor: z.string().trim().min(1, "Nomor pendaftaran wajib diisi.").max(40),
  tanggalLahir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal lahir tidak valid."),
});
export type InputCekStatus = z.infer<typeof skemaCekStatus>;
