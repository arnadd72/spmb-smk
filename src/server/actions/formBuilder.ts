import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { GalatApi } from "@/server/types/galat";
import { KUNCI_INTI, KUNCI_WAJIB, TIPE_BERPILIHAN, kunciDariLabel, skemaFieldBaru, skemaUbahField } from "@/server/validasi/formField";
import type { KonteksAksi } from "./konten";

// Form builder (PRD v3.1 Bagian 14): panitia mengatur tampil, wajib, label, urutan, dan menambah isian kustom.
// Wizard, edit admin, dan input manual membaca tabel FormField saat dijalankan, jadi perubahan langsung berlaku.

export type FieldAdmin = {
  kunci: string;
  langkah: number;
  label: string;
  teksBantuan: string | null;
  tipe: string;
  opsi: { nilai: string; label: string }[] | null;
  opsiDinamis: boolean;
  tampil: boolean;
  wajib: boolean;
  /** Terkunci: tidak bisa disembunyikan atau dijadikan opsional (inti sistem). */
  terkunci: boolean;
  urutan: number;
  isKustom: boolean;
};

const keBentuk = (f: Awaited<ReturnType<typeof prisma.formField.findMany>>[number]): FieldAdmin => {
  const mentah = f.opsi as unknown;
  const dinamis = Boolean(mentah) && !Array.isArray(mentah);
  return {
    kunci: f.kunci,
    langkah: f.langkah,
    label: f.label,
    teksBantuan: f.teksBantuan,
    tipe: f.tipe,
    opsi: Array.isArray(mentah) ? (mentah as { nilai: string; label: string }[]) : null,
    opsiDinamis: dinamis,
    tampil: f.tampil,
    wajib: f.wajib || KUNCI_WAJIB.has(f.kunci),
    terkunci: f.terkunci || KUNCI_INTI.has(f.kunci),
    urutan: f.urutan,
    isKustom: f.isKustom,
  };
};

export async function daftarFieldAdmin(): Promise<FieldAdmin[]> {
  const baris = await prisma.formField.findMany({ orderBy: [{ langkah: "asc" }, { urutan: "asc" }, { id: "asc" }] });
  return baris.map(keBentuk);
}

export async function ubahField(kunci: string, mentah: unknown, ctx: KonteksAksi) {
  const lama = await prisma.formField.findUnique({ where: { kunci } });
  if (!lama) throw GalatApi.tidakDitemukan("Isian tidak ditemukan.");
  const asli = keBentuk(lama);
  const input = skemaUbahField.parse(mentah);
  if (KUNCI_WAJIB.has(kunci) && !input.wajib) {
    throw GalatApi.validasi({ wajib: ["Isian ini wajib diisi dan tidak bisa dijadikan opsional."] });
  }

  if (asli.terkunci && (!input.tampil || !input.wajib)) {
    throw GalatApi.validasi({ tampil: ["Isian inti ini terkunci: tidak bisa disembunyikan atau dijadikan opsional."] });
  }
  if (input.wajib && !input.tampil) throw GalatApi.validasi({ wajib: ["Isian yang disembunyikan tidak bisa wajib."] });
  if (TIPE_BERPILIHAN.includes(lama.tipe) && !asli.opsiDinamis) {
    if ((input.opsi?.length ?? 0) < 2) throw GalatApi.validasi({ opsi: ["Isian pilihan butuh minimal 2 pilihan."] });
  }

  const data = {
    label: input.label,
    teksBantuan: input.teksBantuan,
    tampil: input.tampil,
    wajib: input.wajib,
    urutan: input.urutan,
    ...(TIPE_BERPILIHAN.includes(lama.tipe) && !asli.opsiDinamis && input.opsi ? { opsi: input.opsi } : {}),
  };
  await prisma.formField.update({ where: { kunci }, data });
  await catatAudit({
    userId: ctx.userId,
    aksi: "formfield.ubah",
    entitasTipe: "formfield",
    entitasId: kunci,
    dataLama: { label: lama.label, teksBantuan: lama.teksBantuan, tampil: lama.tampil, wajib: lama.wajib, urutan: lama.urutan },
    dataBaru: { label: input.label, teksBantuan: input.teksBantuan, tampil: input.tampil, wajib: input.wajib, urutan: input.urutan },
    ip: ctx.ip,
  });
  return { kunci };
}

export async function buatField(mentah: unknown, ctx: KonteksAksi) {
  const input = skemaFieldBaru.parse(mentah);
  if (input.wajib && !input.tampil) throw GalatApi.validasi({ wajib: ["Isian yang disembunyikan tidak bisa wajib."] });

  // Kunci unik dari label; bentrok diberi akhiran angka.
  const dasar = kunciDariLabel(input.label);
  let kunci = dasar;
  for (let i = 2; await prisma.formField.findUnique({ where: { kunci } }); i++) kunci = `${dasar}_${i}`;

  await prisma.formField.create({
    data: {
      kunci,
      langkah: input.langkah,
      label: input.label,
      teksBantuan: input.teksBantuan,
      tipe: input.tipe,
      opsi: TIPE_BERPILIHAN.includes(input.tipe) ? input.opsi : undefined,
      tampil: input.tampil,
      wajib: input.wajib,
      urutan: input.urutan,
      isKustom: true,
    },
  });
  await catatAudit({ userId: ctx.userId, aksi: "formfield.buat", entitasTipe: "formfield", entitasId: kunci, dataBaru: { label: input.label, langkah: input.langkah, tipe: input.tipe }, ip: ctx.ip });
  return { kunci };
}

/** Hanya isian kustom. Data yang sudah diisi pendaftar tetap tersimpan di dataKustom. */
export async function hapusField(kunci: string, ctx: KonteksAksi) {
  const f = await prisma.formField.findUnique({ where: { kunci } });
  if (!f) throw GalatApi.tidakDitemukan("Isian tidak ditemukan.");
  if (!f.isKustom) throw new GalatApi(409, "BUILT_IN", "Isian bawaan tidak bisa dihapus. Sembunyikan saja bila tidak dipakai.");
  await prisma.formField.delete({ where: { kunci } });
  await catatAudit({ userId: ctx.userId, aksi: "formfield.hapus", entitasTipe: "formfield", entitasId: kunci, dataLama: { label: f.label, langkah: f.langkah }, ip: ctx.ip });
}
