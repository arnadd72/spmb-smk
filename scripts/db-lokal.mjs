// Postgres lokal untuk Fase A tanpa Docker. Membuat cluster terpisah di .local/pgdata (port 5433),
// tidak menyentuh server Postgres lain di mesin ini. Perintah: init | start | stop | status | reset.
//
// Binary dicari di PG_BIN, lalu folder Laragon, lalu PATH. Docker tetap opsional:
// docker-compose.dev.yml (bila ada Docker) memakai kredensial dan port yang sama.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const akar = resolve(import.meta.dirname, "..");
const dataDir = join(akar, ".local", "pgdata");
const logFile = join(akar, ".local", "pg.log");
const PORT = process.env.PG_PORT ?? "5433";
const USER = "spmb";
const PASSWORD = "spmb_dev";
// spmb_test dipakai tes unit (isinya dikosongkan tiap berkas uji); spmb_e2e_test khusus tes e2e (berisi seed tetap).
const DATABASES = ["spmb", "spmb_test", "spmb_e2e_test"];

function cariBin() {
  const kandidat = [
    process.env.PG_BIN,
    "C:/laragon/bin/postgresql/postgresql-14.5-1/bin",
    "C:/laragon/bin/postgresql/postgresql/bin",
    "C:/Program Files/PostgreSQL/16/bin",
    "C:/Program Files/PostgreSQL/15/bin",
    "C:/Program Files/PostgreSQL/14/bin",
  ].filter(Boolean);
  for (const k of kandidat) if (existsSync(join(k, "pg_ctl.exe"))) return k;
  return null; // coba lewat PATH
}

const bin = cariBin();
const exe = (nama) => (bin ? join(bin, nama) : nama);

function jalan(nama, args, opsi = {}) {
  const hasil = spawnSync(exe(nama), args, { encoding: "utf8", ...opsi });
  if (hasil.error) {
    console.error(`Gagal menjalankan ${nama}: ${hasil.error.message}`);
    console.error("Set PG_BIN ke folder bin Postgres, atau pasang Postgres 14 atau lebih baru.");
    process.exit(1);
  }
  return hasil;
}

function sudahInit() {
  return existsSync(join(dataDir, "PG_VERSION"));
}

function berjalan() {
  return jalan("pg_ctl", ["-D", dataDir, "status"]).status === 0;
}

function init() {
  if (sudahInit()) return console.log("Cluster sudah ada di .local/pgdata.");
  mkdirSync(join(akar, ".local"), { recursive: true });
  const pw = join(akar, ".local", "pw.tmp");
  writeFileSync(pw, PASSWORD);
  const h = jalan("initdb", ["-D", dataDir, "-U", USER, "--pwfile", pw, "--auth=scram-sha-256", "-E", "UTF8", "--no-locale"]);
  rmSync(pw, { force: true });
  if (h.status !== 0) {
    console.error(h.stderr || h.stdout);
    process.exit(1);
  }
  console.log("Cluster dibuat di .local/pgdata.");
}

function buatDatabase() {
  const env = { ...process.env, PGPASSWORD: PASSWORD };
  for (const db of DATABASES) {
    const ada = jalan("psql", ["-h", "localhost", "-p", PORT, "-U", USER, "-d", "postgres", "-tAc", `SELECT 1 FROM pg_database WHERE datname='${db}'`], { env });
    if (ada.stdout.trim() === "1") continue;
    const h = jalan("psql", ["-h", "localhost", "-p", PORT, "-U", USER, "-d", "postgres", "-c", `CREATE DATABASE ${db}`], { env });
    if (h.status !== 0) {
      console.error(h.stderr);
      process.exit(1);
    }
    console.log(`Database ${db} dibuat.`);
  }
}

function start() {
  init();
  if (berjalan()) {
    console.log(`Postgres sudah berjalan di port ${PORT}.`);
  } else {
    // stdio diabaikan: proses daemon mewarisi pipa dan membuat spawnSync menggantung. Log ke file.
    const h = jalan("pg_ctl", ["-D", dataDir, "-l", logFile, "-o", `-p ${PORT}`, "-w", "start"], { stdio: "ignore" });
    if (h.status !== 0) {
      console.error(`Gagal start. Lihat log: ${logFile}`);
      process.exit(1);
    }
    console.log(`Postgres berjalan di localhost:${PORT}.`);
  }
  buatDatabase();
  console.log(`DATABASE_URL="postgresql://${USER}:${PASSWORD}@localhost:${PORT}/spmb"`);
}

function stop() {
  if (!sudahInit() || !berjalan()) return console.log("Postgres lokal tidak berjalan.");
  jalan("pg_ctl", ["-D", dataDir, "-m", "fast", "-w", "stop"]);
  console.log("Postgres lokal dihentikan.");
}

const perintah = process.argv[2];
switch (perintah) {
  case "init":
    init();
    break;
  case "start":
    start();
    break;
  case "stop":
    stop();
    break;
  case "status":
    console.log(sudahInit() ? (berjalan() ? `berjalan di port ${PORT}` : "berhenti") : "belum di-init");
    break;
  case "reset":
    stop();
    rmSync(dataDir, { recursive: true, force: true });
    console.log("Data lokal dihapus. Jalankan npm run db:start untuk membuat ulang.");
    break;
  default:
    console.log("Pemakaian: node scripts/db-lokal.mjs init|start|stop|status|reset");
}
