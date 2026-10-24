import { z } from "zod";
import { ALT_HERO_BAWAAN, ALT_HERO_UMUM, ASET_BAWAAN, FOTO_JURUSAN_BAWAAN, GALERI_BAWAAN } from "@/lib/aset-bawaan";
import { prisma } from "@/server/db/client";
import { catatAudit } from "@/server/services/audit";
import { hapusMediaBila } from "@/server/services/media";
import { ambilPengaturan, hapusPengaturan, simpanPengaturan } from "@/server/services/pengaturan";
import type { BarisAset } from "@/server/types/aset";
import { GalatApi } from "@/server/types/galat";

// Foto yang tampil di situs tetapi sebelumnya tertulis tetap di kode: logo, foto hero, foto tiap jurusan, dan
// foto galeri bawaan (PRD v4 butir 57). Logo, hero, dan foto jurusan diganti dari halaman Foto Beranda, foto galeri bawaan dimuat dari
// halaman Galeri; tanpa pilihan admin, foto bawaan dipakai.
// Logo dan hero disimpan di tabel Pengaturan, foto jurusan di kolom Jurusan.gambar (yang juga bisa diubah di panel Jurusan).

export type KonteksAset = { userId: string; ip?: string };

const KUNCI_UMUM = ["logo", "hero"] as const;
type KunciUmum = (typeof KUNCI_UMUM)[number];

const INFO_UMUM: Record<KunciUmum, { label: string; bantuan: string }> = {
  logo: { label: "Logo sekolah", bantuan: "Tampil di navbar, layar pembuka, beranda, dan penutup. Pakai gambar persegi dengan latar transparan." },
  hero: { label: "Foto utama beranda", bantuan: "Foto lebar di bagian atas beranda, tampil pertama. Pakai foto mendatar yang jelas. Tambahkan foto berikutnya di bawah agar beranda berganti foto otomatis." },
};

const AWALAN_JURUSAN = "jurusan-";
const kunciPengaturan = (k: KunciUmum) => `aset_${k}`;

const skemaUrl = z
  .string({ error: "Gambar wajib diisi." })
  .trim()
  .min(1, "Gambar wajib diisi.")
  .max(500, "Alamat gambar terlalu panjang.")
  .refine((v) => v.startsWith("/") || v.startsWith("https://"), "Alamat gambar harus diawali / atau https://");

export type AsetPublik = { logo: string; hero: string; heroAlt: string };

const ASET_PUBLIK_BAWAAN: AsetPublik = { logo: ASET_BAWAAN.logo, hero: ASET_BAWAAN.hero, heroAlt: ALT_HERO_BAWAAN };

/** Logo dan foto hero untuk halaman publik. Bila database tidak terjangkau, memakai foto bawaan. */
export async function ambilAsetPublik(): Promise<AsetPublik> {
  try {
    const [logo, hero] = await Promise.all([ambilPengaturan(kunciPengaturan("logo")), ambilPengaturan(kunciPengaturan("hero"))]);
    return {
      logo: logo || ASET_BAWAAN.logo,
      hero: hero || ASET_BAWAAN.hero,
      heroAlt: hero && hero !== ASET_BAWAAN.hero ? ALT_HERO_UMUM : ALT_HERO_BAWAAN,
    };
  } catch {
    return ASET_PUBLIK_BAWAAN;
  }
}


export async function daftarAset(): Promise<BarisAset[]> {
  const [pengaturan, jurusan] = await Promise.all([
    Promise.all(KUNCI_UMUM.map((k) => ambilPengaturan(kunciPengaturan(k)))),
    prisma.jurusan.findMany({ orderBy: [{ urutan: "asc" }, { id: "asc" }], select: { kode: true, nama: true, gambar: true } }),
  ]);

  const umum = KUNCI_UMUM.map<BarisAset>((k, i) => {
    const bawaan = ASET_BAWAAN[k];
    const nilai = pengaturan[i] || null;
    return { kunci: k, kelompok: "umum", ...INFO_UMUM[k], url: nilai ?? bawaan, bawaan, diganti: Boolean(nilai && nilai !== bawaan) };
  });
  const perJurusan = jurusan.map<BarisAset>((j) => {
    const bawaan = FOTO_JURUSAN_BAWAAN[j.kode]?.src ?? null;
    return {
      kunci: `${AWALAN_JURUSAN}${j.kode}`,
      kelompok: "jurusan",
      label: `Foto jurusan ${j.kode}`,
      bantuan: `${j.nama}. Tampil di kartu program keahlian dan halaman jurusan.`,
      url: j.gambar ?? bawaan,
      bawaan,
      diganti: Boolean(j.gambar && j.gambar !== bawaan),
    };
  });
  return [...umum, ...perJurusan];
}

type Sasaran = { jenis: "umum"; kunci: KunciUmum } | { jenis: "jurusan"; kode: string };

function tentukanSasaran(kunci: string): Sasaran {
  if ((KUNCI_UMUM as readonly string[]).includes(kunci)) return { jenis: "umum", kunci: kunci as KunciUmum };
  if (kunci.startsWith(AWALAN_JURUSAN)) {
    const kode = kunci.slice(AWALAN_JURUSAN.length).toUpperCase();
    if (/^[A-Z0-9]{2,10}$/.test(kode)) return { jenis: "jurusan", kode };
  }
  throw GalatApi.tidakDitemukan();
}

/** Ganti foto satu slot dengan gambar yang sudah diunggah (lewat /admin/media) atau alamat situs. */
export async function gantiAset(kunci: string, mentah: unknown, ctx: KonteksAset): Promise<void> {
  const sasaran = tentukanSasaran(kunci);
  const hasil = z.object({ url: skemaUrl }, { error: "Gambar wajib diisi." }).safeParse(mentah);
  if (!hasil.success) throw GalatApi.validasi({ url: [hasil.error.issues[0]?.message ?? "Alamat gambar tidak valid."] });
  const { url } = hasil.data;

  let lama: string | null;
  if (sasaran.jenis === "umum") {
    lama = await ambilPengaturan(kunciPengaturan(sasaran.kunci));
    await simpanPengaturan(kunciPengaturan(sasaran.kunci), url);
  } else {
    const j = await prisma.jurusan.findUnique({ where: { kode: sasaran.kode } });
    if (!j) throw GalatApi.tidakDitemukan();
    lama = j.gambar;
    await prisma.jurusan.update({ where: { id: j.id }, data: { gambar: url } });
  }
  if (lama && lama !== url) await hapusMediaBila(lama);
  await catatAudit({ userId: ctx.userId, aksi: "aset.ganti", entitasTipe: "aset", entitasId: kunci, dataLama: { url: lama }, dataBaru: { url }, ip: ctx.ip });
}

/** Buang foto pilihan admin sehingga slot memakai foto bawaan lagi. */
export async function kembalikanAset(kunci: string, ctx: KonteksAset): Promise<void> {
  const sasaran = tentukanSasaran(kunci);

  let lama: string | null;
  if (sasaran.jenis === "umum") {
    lama = await ambilPengaturan(kunciPengaturan(sasaran.kunci));
    await hapusPengaturan(kunciPengaturan(sasaran.kunci));
  } else {
    const j = await prisma.jurusan.findUnique({ where: { kode: sasaran.kode } });
    if (!j) throw GalatApi.tidakDitemukan();
    lama = j.gambar;
    await prisma.jurusan.update({ where: { id: j.id }, data: { gambar: null } });
  }
  if (lama) await hapusMediaBila(lama);
  await catatAudit({ userId: ctx.userId, aksi: "aset.kembalikan", entitasTipe: "aset", entitasId: kunci, dataLama: { url: lama }, ip: ctx.ip });
}

/** Apakah foto bawaan sudah disalin ke galeri (untuk menawarkan tombol muat foto bawaan). */
export const bawaanSudahDimuat = async () =>
  (await prisma.galeri.count({ where: { gambar: { in: GALERI_BAWAAN.map((f) => f.src) } } })) > 0;

/**
 * Salin lima foto bawaan landing ke galeri agar bisa diubah atau dihapus admin. Hanya bila belum pernah dimuat,
 * supaya tidak menduplikasi. Foto yang sudah diunggah admin tetap ada. Mengembalikan jumlah foto yang dibuat.
 */
export async function muatGaleriBawaan(ctx: KonteksAset): Promise<number> {
  if (await bawaanSudahDimuat()) throw GalatApi.validasi({ galeri: ["Foto bawaan sudah ada di galeri."] });
  await prisma.galeri.createMany({
    data: GALERI_BAWAAN.map((f, urutan) => ({ judul: f.ket, gambar: f.src, urutan, isActive: true })),
  });
  await catatAudit({ userId: ctx.userId, aksi: "galeri.muat_bawaan", entitasTipe: "galeri", entitasId: "bawaan", dataBaru: { jumlah: GALERI_BAWAAN.length }, ip: ctx.ip });
  return GALERI_BAWAAN.length;
}
