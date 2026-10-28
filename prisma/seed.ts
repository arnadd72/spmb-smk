import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedFaq, seedFormField, seedReferensi, seedSoalMinat, seedSuperadmin } from "./seed-lib";

// Seed: superadmin dari ADMIN_SEED_USERNAME / ADMIN_SEED_PASSWORD, lalu jurusan, mata pelajaran, bobot,
// field formulir bawaan, dan FAQ awal. Idempoten.
async function main() {
  const username = process.env.ADMIN_SEED_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!username || !password) {
    throw new Error("ADMIN_SEED_USERNAME dan ADMIN_SEED_PASSWORD wajib diisi di .env.");
  }
  if (password.length < 10) throw new Error("ADMIN_SEED_PASSWORD minimal 10 karakter.");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    console.log((await seedSuperadmin(prisma, username, password)) ? `Superadmin "${username}" dibuat.` : `Superadmin "${username}" sudah ada, dilewati.`);
    await seedReferensi(prisma);
    await seedFormField(prisma);
    await seedFaq(prisma);
    await seedSoalMinat(prisma);
    console.log(
      `Referensi: ${await prisma.jurusan.count()} jurusan, ${await prisma.mataPelajaran.count()} mapel, ` +
        `${await prisma.bobotJurusan.count()} bobot, ${await prisma.formField.count()} field formulir, ${await prisma.faq.count()} FAQ.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
