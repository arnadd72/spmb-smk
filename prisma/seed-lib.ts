import bcrypt from "bcryptjs";
import type { PrismaClient } from "../src/generated/prisma/client";
import { FORM_FIELDS } from "./seed-data/formField";
import { BOBOT, FAQ, JURUSAN, MAPEL } from "./seed-data/referensi";

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

export async function seedReferensi(prisma: PrismaClient) {
  for (const j of JURUSAN) {
    await prisma.jurusan.upsert({
      where: { kode: j.kode },
      create: { ...j, prospekKarir: [...j.prospekKarir], keunggulan: [...j.keunggulan] },
      update: {},
    });
  }

  for (const [i, m] of MAPEL.entries()) {
    await prisma.mataPelajaran.upsert({
      where: { kode: m.kode },
      create: { ...m, urutan: i + 1 },
      update: {},
    });
  }

  const jurusan = await prisma.jurusan.findMany();
  const mapel = await prisma.mataPelajaran.findMany();
  for (const [kodeJurusan, bobot] of Object.entries(BOBOT)) {
    const j = jurusan.find((x) => x.kode === kodeJurusan);
    if (!j) throw new Error(`Jurusan ${kodeJurusan} tidak ada.`);
    for (const [kodeMapel, nilai] of Object.entries(bobot)) {
      const m = mapel.find((x) => x.kode === kodeMapel);
      if (!m) throw new Error(`Mata pelajaran ${kodeMapel} tidak ada.`);
      await prisma.bobotJurusan.upsert({
        where: { jurusanId_mataPelajaranId: { jurusanId: j.id, mataPelajaranId: m.id } },
        create: { jurusanId: j.id, mataPelajaranId: m.id, bobot: nilai },
        update: {},
      });
    }
  }
}

export async function seedFormField(prisma: PrismaClient) {
  for (const f of FORM_FIELDS) {
    const { opsi, ...sisa } = f;
    await prisma.formField.upsert({
      where: { kunci: f.kunci },
      create: { ...sisa, opsi: opsi ?? undefined, wajib: f.wajib ?? false, terkunci: f.terkunci ?? false },
      update: {},
    });
  }
}

export async function seedFaq(prisma: PrismaClient) {
  if ((await prisma.faq.count()) > 0) return;
  await prisma.faq.createMany({
    data: FAQ.map((x, i) => ({ ...x, keywords: [...x.keywords], urutan: i + 1 })),
  });
}
