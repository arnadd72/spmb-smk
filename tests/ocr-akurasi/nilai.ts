// Penilai akurasi OCR (alat ukur, bukan tes CI). Menjalankan parser pada hasil baca mentah yang direkam
// tests/e2e/ocr-rekam.spec.ts, lalu membandingkannya dengan kunci jawaban manual docs/ocr/kunci.json.
// Data contoh berisi data pribadi asli dan tidak di-commit; tanpa data, alat ini tidak menilai apa pun.
//   npx tsx tests/ocr-akurasi/nilai.ts [folder rekaman, bawaan _mentah] [--rinci]
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseAkta } from "@/lib/ocr/parser/akta";
import { parseKk } from "@/lib/ocr/parser/kk";
import type { BarisOcr, HasilParser } from "@/lib/ocr/tipe";

const AKAR = path.join(process.cwd(), "docs", "ocr");
const folder = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "_mentah";
const rinci = process.argv.includes("--rinci");

type Kunci = { akta: Record<string, Record<string, string | null>>; kk: Record<string, Record<string, string | null>> };
if (!existsSync(path.join(AKAR, "kunci.json"))) {
  console.log("docs/ocr/kunci.json tidak ada: tidak ada yang dinilai.");
  process.exit(0);
}
const kunci = JSON.parse(readFileSync(path.join(AKAR, "kunci.json"), "utf8")) as Kunci;

/** Bandingkan longgar: huruf besar, tanda baca jadi spasi, awalan wilayah dibuang, angka RT/RW tanpa nol depan. */
function sama(kunci: string, nilai: string, field: string): boolean {
  const n = (s: string) =>
    s
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/^(KABUPATEN|KAB) /, "")
      .trim();
  if (field === "rt" || field === "rw") return Number(kunci) === Number(nilai);
  return n(kunci) === n(nilai);
}

type Skor = { benar: number; salah: number; kosong: number };
const total: Record<string, Skor> = {};
const catat = (field: string, k: string | null | undefined, nilai: string, label: string) => {
  if (k === null || k === undefined) return;
  const s = (total[field] ??= { benar: 0, salah: 0, kosong: 0 });
  if (!nilai) s.kosong++;
  else if (sama(k, nilai, field)) s.benar++;
  else {
    s.salah++;
    if (rinci) console.log(`  SALAH ${label} ${field}: "${nilai}" (seharusnya "${k}")`);
    return;
  }
  if (rinci && !nilai) console.log(`  kosong ${label} ${field} (seharusnya "${k}")`);
};

function baca(jenis: "akta" | "kk", f: string): BarisOcr[] | null {
  const p = path.join(AKAR, folder, jenis, `${f}.json`);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as { baris: BarisOcr[] }).baris : null;
}

const nilai = (h: HasilParser, k: string) => h[k]?.nilai ?? "";

for (const [f, k] of Object.entries(kunci.akta)) {
  const baris = baca("akta", f);
  if (!baris) continue;
  const h = parseAkta(baris, k.nama ?? "");
  const label = `akta/${f}`;
  if (rinci) console.log(label);
  catat("akta.nama", k.nama, h.nama, label);
  catat("akta.tanggal_lahir", k.tanggal_lahir, h.tanggalLahir ?? "", label);
  for (const field of ["tempat_lahir", "jenis_kelamin", "nama_ayah", "nama_ibu"]) catat(`akta.${field}`, k[field], nilai(h.fields, field), label);
}

for (const [f, k] of Object.entries(kunci.kk)) {
  const baris = baca("kk", f);
  if (!baris) continue;
  const h = parseKk(baris, k.siswa ?? "");
  const label = `kk/${f}`;
  if (rinci) console.log(label);
  for (const field of ["no_kk", "nik", "alamat", "rt", "rw", "desa", "kecamatan", "kabupaten", "propinsi", "nama_ayah", "nama_ibu", "nik_ayah", "nik_ibu"]) {
    catat(`kk.${field}`, k[field], nilai(h.fields, field), label);
  }
}

let b = 0;
let s = 0;
let n = 0;
console.log(`\nRekaman: ${folder}\n${"field".padEnd(22)} benar  salah  kosong`);
for (const [field, x] of Object.entries(total)) {
  console.log(`${field.padEnd(22)} ${String(x.benar).padStart(5)}  ${String(x.salah).padStart(5)}  ${String(x.kosong).padStart(6)}`);
  b += x.benar;
  s += x.salah;
  n += x.benar + x.salah + x.kosong;
}
console.log(`${"TOTAL".padEnd(22)} ${String(b).padStart(5)}  ${String(s).padStart(5)}  ${String(n - b - s).padStart(6)}   benar ${Math.round((b / n) * 100)}%, terisi salah ${Math.round((s / n) * 100)}%`);
