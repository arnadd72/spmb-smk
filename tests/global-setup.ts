import { execSync } from "node:child_process";

// Terapkan migrasi ke database test sekali sebelum seluruh test dijalankan.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://spmb:spmb_dev@localhost:5433/spmb_test";
  execSync("node node_modules/prisma/build/index.js migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
