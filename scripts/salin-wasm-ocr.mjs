// Menyalin runtime WASM onnxruntime-web ke public/ocr/ort supaya OCR di browser tidak bergantung CDN pihak ketiga.
// Dijalankan otomatis oleh postinstall (berarti juga saat build di Vercel). Hasilnya tidak di-commit (.gitignore).
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const akar = resolve(import.meta.dirname, "..");
const sumber = join(akar, "node_modules", "onnxruntime-web", "dist");
const tujuan = join(akar, "public", "ocr", "ort");
const berkas = ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"];

if (!existsSync(sumber)) {
  console.warn("[ocr] onnxruntime-web belum terpasang, lewati penyalinan WASM.");
  process.exit(0);
}
mkdirSync(tujuan, { recursive: true });
for (const nama of berkas) copyFileSync(join(sumber, nama), join(tujuan, nama));
console.log(`[ocr] ${berkas.length} berkas WASM disalin ke public/ocr/ort`);
