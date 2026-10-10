import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

// Seed A0: satu superadmin dari ADMIN_SEED_USERNAME / ADMIN_SEED_PASSWORD. Seed lain (jurusan, mapel,
// bobot, FAQ, form field) ditambahkan di A2. Idempoten: tidak menimpa password akun yang sudah ada.
async function main() {
  const username = process.env.ADMIN_SEED_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!username || !password) {
    throw new Error("ADMIN_SEED_USERNAME dan ADMIN_SEED_PASSWORD wajib diisi di .env.");
  }
  if (password.length < 10) throw new Error("ADMIN_SEED_PASSWORD minimal 10 karakter.");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const ada = await prisma.user.findUnique({ where: { username } });
    if (ada) {
      console.log(`Superadmin "${username}" sudah ada, dilewati.`);
      return;
    }

    await prisma.user.create({
      data: {
        name: "Super Admin",
        username,
        passwordHash: await bcrypt.hash(password, 12),
        peran: "superadmin",
        mustChangePassword: true,
      },
    });
    console.log(`Superadmin "${username}" dibuat.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
