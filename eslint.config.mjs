import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Folder build server dev milik tes e2e (playwright.config.ts).
    ".next-e2e/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Kerja lama yang diarsipkan, bukan kode aktif.
    "_archive/**",
    ".local/**",
    // Runtime WASM OCR hasil salinan dari node_modules (scripts/salin-wasm-ocr.mjs).
    "public/ocr/**",
  ]),
]);

export default eslintConfig;
