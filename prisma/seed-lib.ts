import bcrypt from "bcryptjs";
import { Prisma, type PrismaClient } from "../src/generated/prisma/client";
import { FORM_FIELDS } from "./seed-data/formField";
import { FAQ, JURUSAN } from "./seed-data/referensi";
import { SOAL_BAWAAN } from "./seed-data/soalMinat";

// Seed idempoten: boleh dijalankan berulang tanpa menduplikasi atau menimpa perubahan panitia
// pada konten yang sudah ada (jurusan, mapel, bobot, form field hanya dibuat bila belum ada).

export async function seedSuperadmin(prisma: PrismaClient, username: string, password: string) {
  const ada = await prisma.user.findUnique({ where: { username } });
  if (ada) return false;

  await prisma.user.create({
    data: {
      name: "Super Admin",
      username,
      passwordHash: await bcrypt.hash(password, 12),
      peran: "superadmin",
    },
  });
  return true;
}

/**
 * Jurusan FKK berganti nama menjadi LPK3 (bukan jurusan tambahan). Basis data lama: baris FKK diubah jadi LPK3 agar
 * pendaftar dan bobotnya ikut. Bila LPK3 sudah terlanjur dibuat berdampingan dengan FKK, rujukan dipindah lalu FKK dihapus.
 */
export async function gantiFkkJadiLpk3(prisma: PrismaClient) {
  const fkk = await prisma.jurusan.findUnique({ where: { kode: "FKK" } });
  if (!fkk) return;
  const baru = JURUSAN.find((x) => x.kode === "LPK3");
  if (!baru) throw new Error("Seed LPK3 tidak ditemukan.");
  const lpk3 = await prisma.jurusan.findUnique({ where: { kode: "LPK3" } });

  if (!lpk3) {
    await prisma.jurusan.update({
      where: { id: fkk.id },
      data: { kode: baru.kode, nama: baru.nama, deskripsi: baru.deskripsi, prospekKarir: [...baru.prospekKarir], keunggulan: [...baru.keunggulan] },
    });
    return;
  }
  await prisma.$transaction([
    prisma.pendaftar.updateMany({ where: { jurusan1Id: fkk.id }, data: { jurusan1Id: lpk3.id } }),
    prisma.pendaftar.updateMany({ where: { jurusan2Id: fkk.id }, data: { jurusan2Id: lpk3.id } }),
    prisma.pendaftar.updateMany({ where: { rekomendasiJurusanId: fkk.id }, data: { rekomendasiJurusanId: lpk3.id } }),
    prisma.jurusan.delete({ where: { id: fkk.id } }), // bobot FKK ikut terhapus (onDelete: Cascade)
  ]);
}

export async function seedReferensi(prisma: PrismaClient) {
  await gantiFkkJadiLpk3(prisma);
  for (const j of JURUSAN) {
    await prisma.jurusan.upsert({
      where: { kode: j.kode },
      create: { ...j, prospekKarir: [...j.prospekKarir], keunggulan: [...j.keunggulan] },
      update: {},
    });
  }
  // Mata pelajaran dan bobot tidak di-seed lagi: saran jurusan kini dari tes minat bakat (PRD 1.3 butir 65).
}

export async function seedFormField(prisma: PrismaClient) {
  await prisma.formField.deleteMany({ where: { kunci: { in: ["no_ijazah", "ijazah_nomor_tahun", "ayah_ttl", "ibu_ttl", "jurusan_2", "nilai_ujian", "nilai_rapor"] } } });
  for (const f of FORM_FIELDS) {
    const { opsi, ...sisa } = f;
    await prisma.formField.upsert({
      where: { kunci: f.kunci },
      create: { ...sisa, opsi: opsi ?? undefined, wajib: f.wajib ?? false, terkunci: f.terkunci ?? false },
      update: {},
    });
    // Basis data lama: lengkapi keterangan dan contoh yang masih kosong tanpa menimpa suntingan panitia.
    if (f.teksBantuan) await prisma.formField.updateMany({ where: { kunci: f.kunci, teksBantuan: null }, data: { teksBantuan: f.teksBantuan } });
    if (f.placeholder) await prisma.formField.updateMany({ where: { kunci: f.kunci, placeholder: null }, data: { placeholder: f.placeholder } });
    if (Array.isArray(f.opsi)) await prisma.formField.updateMany({ where: { kunci: f.kunci, opsi: { equals: Prisma.DbNull } }, data: { opsi: f.opsi } });
  }
  // Tahun tamat berubah dari isian teks menjadi dropdown 2025-2030, hanya bila belum disunting panitia.
  const tahunTamat = FORM_FIELDS.find((x) => x.kunci === "tamat_tahun");
  if (tahunTamat && Array.isArray(tahunTamat.opsi)) {
    await prisma.formField.updateMany({
      where: { kunci: "tamat_tahun", tipe: "text" },
      data: { tipe: "select", opsi: tahunTamat.opsi, placeholder: null, teksBantuan: tahunTamat.teksBantuan },
    });
  }
  // Keterangan pas foto diperjelas (21 Okt 2026), hanya bila belum disunting panitia.
  await prisma.formField.updateMany({
    where: { kunci: "pas_foto", teksBantuan: "Foto tampak depan berlatar merah, memakai seragam sekolah asal, rapi, tanpa topi. Foto ini otomatis dicetak di formulir pendaftaran. Format JPG atau PNG." },
    data: { teksBantuan: "Foto tampak depan berlatar merah (pas foto background merah), memakai seragam sekolah asal, rapi, tanpa topi. Foto ini otomatis dicetak di formulir pendaftaran. Format JPG atau PNG." },
  });
  // Keterangan tempat lahir dipersingkat (21 Okt 2026), hanya bila belum disunting panitia.
  await prisma.formField.updateMany({
    where: { kunci: "tempat_lahir", teksBantuan: "Tulis nama kota atau kabupaten tempat lahir, sesuai akta. Contoh: BANYUMAS. Tanggal lahir diisi terpisah." },
    data: { teksBantuan: "Tulis nama kota atau kabupaten tempat lahir, sesuai akta. Contoh: BANYUMAS." },
  });
  // Hapus placeholder lama belajar karena satuannya sudah tampil di sisi kanan input.
  await prisma.formField.updateMany({
    where: { kunci: "lama_belajar", placeholder: { in: ["3 tahun", "3"] } },
    data: { placeholder: null },
  });
  await prisma.formField.updateMany({
    where: { kunci: "lama_belajar", teksBantuan: "Contoh: 3 tahun." },
    data: { teksBantuan: "Angka saja. Contoh: 3." },
  });
  // Dokumen pendaftaran ini wajib diunggah.
  await prisma.formField.updateMany({
    where: { kunci: { in: ["akta", "kk"] }, wajib: false },
    data: { wajib: true },
  });
  // Hobi ini diwajibkan sesuai revisi formulir.
  await prisma.formField.updateMany({
    where: { kunci: { in: ["hobi_olahraga", "hobi_kesenian", "hobi_lain", "hobi_organisasi", "hobi_prestasi"] }, wajib: false },
    data: { wajib: true },
  });
  // Email wajib agar kode pendaftaran dapat dikirim.
  await prisma.formField.updateMany({
    where: { kunci: "email", wajib: false },
    data: { wajib: true },
  });
  // Label yang berubah karena revisi sekolah (hanya bila belum disunting panitia).
  const labelBaru: Record<string, [string, string]> = {
    jurusan_1: ["Pilihan jurusan 1", "Pilihan jurusan"],
    asal_sekolah: ["Asal sekolah", "Nama sekolah asal"],
    tinggi_badan: ["Tinggi badan (cm)", "Tinggi badan"],
    berat_badan: ["Berat badan (kg)", "Berat badan"],
  };
  // Nama sekolah asal pindah dari langkah 5 ke langkah 7 (revisi sekolah), hanya bila belum dipindah panitia.
  await prisma.formField.updateMany({ where: { kunci: "asal_sekolah", langkah: 5 }, data: { langkah: 7, urutan: 0 } });
  for (const [kunci, [lama, baru]] of Object.entries(labelBaru)) {
    await prisma.formField.updateMany({ where: { kunci, label: lama }, data: { label: baru } });
  }
}

export async function seedFaq(prisma: PrismaClient) {
  if ((await prisma.faq.count()) > 0) return;
  await prisma.faq.createMany({
    data: FAQ.map((x, i) => ({ ...x, keywords: [...x.keywords], urutan: i + 1 })),
  });
}

/** Soal tes minat bakat bawaan (PRD 1.3 butir 80). Hanya bila tabel kosong, agar perubahan admin tidak tertimpa. */
export async function seedSoalMinat(prisma: PrismaClient) {
  if ((await prisma.soalMinat.count()) > 0) return;
  await prisma.soalMinat.createMany({
    data: SOAL_BAWAAN.map((x, i) => ({ teks: x.teks, opsi: [...x.opsi], urutan: i + 1 })),
  });
}
