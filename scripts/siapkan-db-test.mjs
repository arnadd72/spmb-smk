// Siapkan database tes e2e (spmb_test di Postgres lokal): migrasi lalu seed. Aman diulang.
// Prasyarat: `npm run db:start`. Isi database tes dari .env.test, tidak pernah menyentuh Supabase.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import dotenv from "dotenv";

const akar = resolve(import.meta.dirname, "..");
dotenv.config({ path: resolve(akar, ".env.test"), override: true, quiet: true });

const url = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\/[^@]+@(localhost|127\.0\.0\.1)(:\d+)?\/[^/?]+_test(\?.*)?$/.test(url)) {
  console.error("DATABASE_URL di .env.test harus Postgres lokal dengan nama database berakhiran _test.");
  process.exit(1);
}

for (const args of [["prisma", "migrate", "deploy"], ["prisma", "db", "seed"]]) {
  console.log(`\n> npx ${args.join(" ")}`);
  const h = spawnSync("npx", args, { cwd: akar, stdio: "inherit", shell: true, env: process.env });
  if (h.status !== 0) {
    console.error("Gagal. Pastikan Postgres lokal berjalan (npm run db:start).");
    process.exit(h.status ?? 1);
  }
}
console.log("\nDatabase tes siap. Jalankan: npm run test:e2e");
