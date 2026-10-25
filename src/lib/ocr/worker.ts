/// <reference lib="webworker" />
// Web Worker OCR (PRD v4 11.2, poin F): PaddleOCR PP-OCRv6 tiny lewat onnxruntime-web, sepenuhnya di browser pendaftar.
// Model dan runtime WASM disajikan dari domain sendiri (/ocr/model, /ocr/ort) dan di-cache panjang oleh browser.
// Semua kerja piksel (decode, perkecil, luruskan, baca) ada di sini supaya antarmuka tidak macet di HP.
import * as ort from "onnxruntime-web";
import { PaddleOcrService } from "ppu-paddle-ocr/web";
import { perkirakanSudut } from "./deskew";
import { PUTARAN_CADANGAN, bacaanLemah, kekuatanBaca } from "./orientasi";
import type { BarisOcr } from "./tipe";

export type PesanMasuk = { id: number; berkas: Blob; sisiMaks: number };
export type PesanKeluar =
  | { tipe: "tahap"; id: number; tahap: "muat-model" | "siapkan" | "baca" }
  | { tipe: "hasil"; id: number; baris: BarisOcr[]; lebar: number; tinggi: number; sudut: number; durasiMs: number }
  | { tipe: "galat"; id: number; pesan: string };

const kirim = (p: PesanKeluar) => (self as unknown as Worker).postMessage(p);

ort.env.wasm.wasmPaths = "/ocr/ort/";
ort.env.wasm.numThreads = 1;

const MODEL = {
  detection: "/ocr/model/PP-OCRv6_tiny_det.ort",
  recognition: "/ocr/model/PP-OCRv6_tiny_rec.ort",
  charactersDictionary: "/ocr/model/ppocrv6_tiny_dict.txt",
};

let layanan: Promise<PaddleOcrService> | null = null;
function ambilLayanan(): Promise<PaddleOcrService> {
  layanan ??= (async () => {
    const s = new PaddleOcrService({ model: MODEL, detection: { maxSideLength: 1600 }, session: { executionProviders: ["wasm"], graphOptimizationLevel: "all" } });
    await s.initialize();
    return s;
  })().catch((e) => {
    layanan = null;
    throw e;
  });
  return layanan;
}

/** Decode (mengikuti orientasi EXIF) lalu skalakan ke sisi terpanjang `sisiMaks`, termasuk memperbesar foto kecil. */
async function muatKanvas(berkas: Blob, sisiMaks: number): Promise<OffscreenCanvas> {
  const bmp = await createImageBitmap(berkas, { imageOrientation: "from-image" });
  // Foto kecil diperbesar: huruf setinggi 10 piksel tidak terdeteksi model tiny, setelah diperbesar terbaca (uji 26 Okt 2026).
  const skala = sisiMaks / Math.max(bmp.width, bmp.height);
  const lebar = Math.max(1, Math.round(bmp.width * skala));
  const tinggi = Math.max(1, Math.round(bmp.height * skala));
  const kanvas = new OffscreenCanvas(lebar, tinggi);
  const ctx = kanvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, lebar, tinggi);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, lebar, tinggi);
  bmp.close();
  return kanvas;
}

/** Putar kanvas 90, 180, atau 270 derajat searah jarum jam. */
function putar(sumber: OffscreenCanvas, derajat: number): OffscreenCanvas {
  const tegak = derajat % 180 !== 0;
  const kanvas = new OffscreenCanvas(tegak ? sumber.height : sumber.width, tegak ? sumber.width : sumber.height);
  const ctx = kanvas.getContext("2d", { willReadFrequently: true })!;
  ctx.translate(kanvas.width / 2, kanvas.height / 2);
  ctx.rotate((derajat * Math.PI) / 180);
  ctx.drawImage(sumber, -sumber.width / 2, -sumber.height / 2);
  return kanvas;
}

/** Luruskan kemiringan kecil. Kemiringan diperkirakan pada salinan kecil (cepat), lalu diterapkan ke gambar penuh. */
function luruskan(kanvas: OffscreenCanvas): { kanvas: OffscreenCanvas; sudut: number } {
  const { width: lebar, height: tinggi } = kanvas;
  const k = Math.min(1, 600 / Math.max(lebar, tinggi));
  const kl = Math.max(20, Math.round(lebar * k));
  const kt = Math.max(20, Math.round(tinggi * k));
  const kecil = new OffscreenCanvas(kl, kt);
  const kctx = kecil.getContext("2d", { willReadFrequently: true })!;
  kctx.drawImage(kanvas, 0, 0, kl, kt);
  const rgba = kctx.getImageData(0, 0, kl, kt).data;
  const abu = new Uint8Array(kl * kt);
  for (let i = 0; i < abu.length; i++) abu[i] = (rgba[i * 4] * 0.299 + rgba[i * 4 + 1] * 0.587 + rgba[i * 4 + 2] * 0.114) | 0;
  const sudut = perkirakanSudut(abu, kl, kt);
  if (Math.abs(sudut) < 0.4) return { kanvas, sudut: 0 };

  const lurus = new OffscreenCanvas(lebar, tinggi);
  const lctx = lurus.getContext("2d", { willReadFrequently: true })!;
  lctx.fillStyle = "#fff";
  lctx.fillRect(0, 0, lebar, tinggi);
  lctx.translate(lebar / 2, tinggi / 2);
  lctx.rotate((-sudut * Math.PI) / 180);
  lctx.drawImage(kanvas, -lebar / 2, -tinggi / 2);
  return { kanvas: lurus, sudut };
}

async function baca(s: PaddleOcrService, kanvas: OffscreenCanvas): Promise<BarisOcr[]> {
  // per-box: sel tabel KK dibaca terpisah. per-line menggabungkan sel yang dipisah garis tabel dan hasilnya rusak.
  const hasil = await s.recognize(kanvas as never, { flatten: true, strategy: "per-box" });
  return hasil.results.map((r) => ({ teks: r.text, kotak: [r.box.x, r.box.y, r.box.x + r.box.width, r.box.y + r.box.height], skor: r.confidence }));
}

self.onmessage = async (e: MessageEvent<PesanMasuk>) => {
  const { id, berkas, sisiMaks } = e.data;
  const mulai = performance.now();
  try {
    // Decode lebih dulu: berkas yang rusak gagal cepat tanpa mengunduh model.
    kirim({ tipe: "tahap", id, tahap: "siapkan" });
    const asli = await muatKanvas(berkas, sisiMaks);
    kirim({ tipe: "tahap", id, tahap: "muat-model" });
    const s = await ambilLayanan();
    kirim({ tipe: "tahap", id, tahap: "baca" });

    let terbaik = luruskan(asli);
    let baris = await baca(s, terbaik.kanvas);
    // Dokumen terputar (KK mendatar difoto dengan HP tegak): coba putaran lain, pakai yang terbaca paling kuat.
    for (const derajat of PUTARAN_CADANGAN) {
      if (!bacaanLemah(baris)) break;
      const calon = luruskan(putar(asli, derajat));
      const barisCalon = await baca(s, calon.kanvas);
      if (kekuatanBaca(barisCalon) > kekuatanBaca(baris)) {
        terbaik = calon;
        baris = barisCalon;
      }
    }
    kirim({ tipe: "hasil", id, baris, lebar: terbaik.kanvas.width, tinggi: terbaik.kanvas.height, sudut: terbaik.sudut, durasiMs: performance.now() - mulai });
  } catch (err) {
    kirim({ tipe: "galat", id, pesan: err instanceof Error ? err.message : String(err) });
  }
};
