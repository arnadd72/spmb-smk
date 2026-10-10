import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Satu instance Prisma per proses (singleton), supaya hot reload dev tidak menumpuk koneksi.
// Query lewat DATABASE_URL (di Supabase: pooler mode transaksi). Migrasi memakai DIRECT_URL (prisma.config.ts).
const globalUntukPrisma = globalThis as unknown as { prisma?: PrismaClient };

function buatClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diisi.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = globalUntukPrisma.prisma ?? buatClient();

if (process.env.NODE_ENV !== "production") globalUntukPrisma.prisma = prisma;
