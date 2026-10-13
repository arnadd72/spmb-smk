"use client";

import type { PesanKeluar } from "./worker";
import type { BarisOcr } from "./tipe";

// Antarmuka OCR di browser (PRD v4 11.2). Hanya modul ini yang tahu Web Worker; parser dan UI hanya melihat
// `bacaDokumen`. Gagal, terlalu lama, atau tidak didukung perangkat selalu berujung pada isi manual (PRD 11.5).

/** Batas waktu satu pembacaan (keputusan pemilik proyek: 40 detik). Lewat batas, pendaftar diminta mengisi manual. */
export const BATAS_WAKTU_MS = 40_000;
/** Sisi terpanjang gambar yang dibaca. 1500 px menjaga angka KK tetap terbaca dan waktu baca wajar di HP. */
export const SISI_MAKS_PX = 1500;

export type Tahap = "muat-model" | "siapkan" | "baca";
export type HasilBaca = { baris: BarisOcr[]; lebar: number; tinggi: number; sudut: number; durasiMs: number };

export type KodeGalatOcr = "tidak_didukung" | "waktu_habis" | "gagal";
export class GalatOcr extends Error {
  constructor(
    readonly kode: KodeGalatOcr,
    pesan: string,
  ) {
    super(pesan);
  }
}

declare global {
  interface Window {
    /** Hanya untuk test e2e: menggantikan mesin sungguhan dengan hasil tetap. */
    __SPMB_OCR_PALSU__?: (berkas: File) => Promise<HasilBaca>;
  }
}

export function ocrDidukung(): boolean {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap !== "undefined" &&
    typeof WebAssembly !== "undefined"
  );
}

let worker: Worker | null = null;
let nomor = 0;
let antrean: Promise<unknown> = Promise.resolve();

function ambilWorker(): Worker {
  worker ??= new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  return worker;
}

function jalankan(berkas: File, batasMs: number, onTahap?: (t: Tahap) => void): Promise<HasilBaca> {
  return new Promise((resolve, reject) => {
    const w = ambilWorker();
    const id = ++nomor;
    const akhiri = () => {
      clearTimeout(timer);
      w.removeEventListener("message", dengar);
      w.removeEventListener("error", galat);
    };
    const timer = setTimeout(() => {
      akhiri();
      w.terminate();
      worker = null;
      reject(new GalatOcr("waktu_habis", "Pembacaan dokumen terlalu lama."));
    }, batasMs);
    const dengar = (e: MessageEvent<PesanKeluar>) => {
      const p = e.data;
      if (p.id !== id) return;
      if (p.tipe === "tahap") return onTahap?.(p.tahap);
      akhiri();
      if (p.tipe === "hasil") resolve({ baris: p.baris, lebar: p.lebar, tinggi: p.tinggi, sudut: p.sudut, durasiMs: p.durasiMs });
      else reject(new GalatOcr("gagal", p.pesan));
    };
    const galat = () => {
      akhiri();
      worker = null;
      reject(new GalatOcr("gagal", "Mesin baca dokumen tidak dapat dijalankan."));
    };
    w.addEventListener("message", dengar);
    w.addEventListener("error", galat);
    w.postMessage({ id, berkas, sisiMaks: SISI_MAKS_PX });
  });
}

/** Baca satu foto dokumen. Satu pembacaan pada satu waktu (memori HP terbatas). */
export function bacaDokumen(berkas: File, opsi: { batasMs?: number; onTahap?: (t: Tahap) => void } = {}): Promise<HasilBaca> {
  if (typeof window !== "undefined" && window.__SPMB_OCR_PALSU__) return window.__SPMB_OCR_PALSU__(berkas);
  if (berkas.type === "application/pdf") {
    return Promise.reject(new GalatOcr("tidak_didukung", "Berkas PDF tidak dibaca otomatis."));
  }
  if (!ocrDidukung()) return Promise.reject(new GalatOcr("tidak_didukung", "Perangkat tidak mendukung pembacaan otomatis."));

  const giliran = antrean.then(() => jalankan(berkas, opsi.batasMs ?? BATAS_WAKTU_MS, opsi.onTahap));
  antrean = giliran.catch(() => undefined);
  return giliran;
}
