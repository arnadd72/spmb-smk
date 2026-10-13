import { z } from "zod";

// Form builder (PRD v3.1 Bagian 14): pengaturan isian formulir pendaftaran per langkah. Satu skema untuk server dan form admin.

/** Isian inti: dipakai kolom wajib, cek status, atau alur wizard, sehingga tidak boleh disembunyikan atau dijadikan opsional. */
export const KUNCI_INTI = new Set(["nama_lengkap", "nisn", "tanggal_lahir", "setuju", "jurusan_1", "nilai_rapor", "konfirmasi_final"]);

/** Langkah yang boleh diberi isian kustom, dan tipe yang didukung wizard. */
export const LANGKAH_KUSTOM = [2, 5, 6, 7] as const;
export const TIPE_KUSTOM = ["text", "textarea", "number", "tel", "email", "date", "select", "radio", "checkbox", "file"] as const;
export const TIPE_BERPILIHAN = ["select", "radio"];

const opsi = z
  .array(
    z.object({
      nilai: z.string().trim().min(1, "Nilai pilihan wajib diisi.").max(100),
      label: z.string().trim().min(1, "Label pilihan wajib diisi.").max(150),
    }),
  )
  .max(40, "Maksimal 40 pilihan.")
  .refine((o) => new Set(o.map((x) => x.nilai)).size === o.length, "Nilai pilihan tidak boleh sama.");

const teksBantuan = z.string().trim().max(300, "Teks bantuan maksimal 300 karakter.").nullish().transform((v) => (v ? v : null));

export const skemaUbahField = z.object({
  label: z.string({ error: "Label wajib diisi." }).trim().min(2, "Label minimal 2 karakter.").max(120, "Label maksimal 120 karakter."),
  teksBantuan,
  tampil: z.boolean(),
  wajib: z.boolean(),
  urutan: z.coerce.number({ error: "Urutan harus angka." }).int("Urutan harus bilangan bulat.").min(0).max(100000),
  opsi: opsi.optional(),
});
export type InputUbahField = z.infer<typeof skemaUbahField>;

export const skemaFieldBaru = skemaUbahField
  .extend({
    langkah: z.coerce.number().refine((n) => (LANGKAH_KUSTOM as readonly number[]).includes(n), "Isian kustom hanya untuk langkah 2, 5, 6, atau 7."),
    tipe: z.enum(TIPE_KUSTOM, { error: "Tipe isian tidak valid." }),
  })
  .superRefine((v, ctx) => {
    if (TIPE_BERPILIHAN.includes(v.tipe) && (v.opsi?.length ?? 0) < 2) {
      ctx.addIssue({ code: "custom", path: ["opsi"], message: "Isian pilihan butuh minimal 2 pilihan." });
    }
    if (v.tipe === "file" && v.langkah !== 2) {
      ctx.addIssue({ code: "custom", path: ["langkah"], message: "Isian berkas hanya bisa ditempatkan di langkah 2." });
    }
  });
export type InputFieldBaru = z.infer<typeof skemaFieldBaru>;

/** "nilai|label" per baris, atau hanya "label" (nilai = label). Dipakai form admin. */
export function uraiOpsi(teks: string): { nilai: string; label: string }[] {
  return teks
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const [nilai, ...sisa] = b.split("|");
      const label = sisa.join("|").trim();
      return { nilai: nilai.trim(), label: label || nilai.trim() };
    });
}

/** Kunci stabil dari label: kustom_{slug}. */
export function kunciDariLabel(label: string): string {
  const slug = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `kustom_${slug || "isian"}`;
}
