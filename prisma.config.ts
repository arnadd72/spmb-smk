import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: URL koneksi dan seed diatur di sini, bukan di schema.prisma.
// Migrasi memakai DIRECT_URL bila ada (Supabase pooler tidak cocok untuk migrate), selain itu DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
