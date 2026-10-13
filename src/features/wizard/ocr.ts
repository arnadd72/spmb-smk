"use client";

import { apiFetch } from "@/lib/api-client";
import { GalatOcr, bacaDokumen, type HasilBaca, type KodeGalatOcr, type Tahap } from "@/lib/ocr/mesin";
import { parseAkta } from "@/lib/ocr/parser/akta";
import { parseKk } from "@/lib/ocr/parser/kk";
import { parseRapor, type HasilRapor } from "@/lib/ocr/parser/rapor";
import type { FieldOcr, HasilParser, JenisOcr, Keyakinan, MapelRef } from "@/lib/ocr/tipe";

// Penghubung wizard dengan OCR di browser (PRD v4 Bagian 11): jalankan, parse, catat ringkasan ke server.
// Gagal apa pun menghasilkan { ok: false } dan UI beralih ke isi manual; tidak pernah melempar ke pemanggil.

export type HasilBacaDokumen<T> = { ok: true; hasil: T; durasiMs: number } | { ok: false; kode: KodeGalatOcr };

export type KonteksOcr = { namaMurid: string; tanggalLahir: string; mapel: MapelRef[] };

export type HasilIsian = { fields: HasilParser; peringatan: string[] };

export const NAMA_TAHAP: Record<Tahap, string> = {
  siapkan: "Menyiapkan foto...",
  "muat-model": "Memuat pembaca dokumen (hanya lama pada pemakaian pertama)...",
  baca: "Membaca dokumen...",
};

/** Catat ringkasan ke server untuk statistik. Gagal mencatat tidak boleh mengganggu pendaftar. */
function catat(jenis: JenisOcr, sukses: boolean, durasiMs: number, keyakinan: Record<string, Keyakinan>, galat?: KodeGalatOcr) {
  void apiFetch("/draf/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jenis, sukses, durasiMs: Math.round(durasiMs), keyakinan, galat }),
  }).catch(() => undefined);
}

const ringkasKeyakinan = (f: HasilParser) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.keyakinan])) as Record<string, Keyakinan>;

async function baca(berkas: File, onTahap?: (t: Tahap) => void): Promise<{ ok: true; hasil: HasilBaca } | { ok: false; kode: KodeGalatOcr; durasiMs: number }> {
  const mulai = performance.now();
  try {
    return { ok: true, hasil: await bacaDokumen(berkas, { onTahap }) };
  } catch (e) {
    return { ok: false, kode: e instanceof GalatOcr ? e.kode : "gagal", durasiMs: performance.now() - mulai };
  }
}

/** Sukses berarti ada paling sedikit satu field terisi; selain itu dianggap gagal (pendaftar mengisi manual). */
const adaIsi = (f: HasilParser) => Object.values(f).some((v: FieldOcr) => v.nilai !== "");

export async function bacaAkta(berkas: File, k: KonteksOcr, onTahap?: (t: Tahap) => void): Promise<HasilBacaDokumen<HasilIsian & { tanggalLahir: string | null }>> {
  const r = await baca(berkas, onTahap);
  if (!r.ok) {
    catat("akta", false, r.durasiMs, {}, r.kode);
    return r;
  }
  const h = parseAkta(r.hasil.baris, k.namaMurid);
  const peringatan = [...h.peringatan];
  if (h.tanggalLahir && k.tanggalLahir && h.tanggalLahir !== k.tanggalLahir) {
    peringatan.push(`Tanggal lahir di Akta (${h.tanggalLahir}) berbeda dengan Langkah 1 (${k.tanggalLahir}). Periksa kembali.`);
  }
  const sukses = adaIsi(h.fields);
  catat("akta", sukses, r.hasil.durasiMs, ringkasKeyakinan(h.fields));
  return sukses ? { ok: true, hasil: { fields: h.fields, peringatan, tanggalLahir: h.tanggalLahir }, durasiMs: r.hasil.durasiMs } : { ok: false, kode: "gagal" };
}

export async function bacaKk(berkas: File, k: KonteksOcr, onTahap?: (t: Tahap) => void): Promise<HasilBacaDokumen<HasilIsian>> {
  const r = await baca(berkas, onTahap);
  if (!r.ok) {
    catat("kk", false, r.durasiMs, {}, r.kode);
    return r;
  }
  const h = parseKk(r.hasil.baris, k.namaMurid);
  const sukses = adaIsi(h.fields);
  catat("kk", sukses, r.hasil.durasiMs, ringkasKeyakinan(h.fields));
  return sukses ? { ok: true, hasil: { fields: h.fields, peringatan: h.peringatan }, durasiMs: r.hasil.durasiMs } : { ok: false, kode: "gagal" };
}

export async function bacaRapor(berkas: File, k: KonteksOcr, onTahap?: (t: Tahap) => void): Promise<HasilBacaDokumen<HasilRapor>> {
  const r = await baca(berkas, onTahap);
  if (!r.ok) {
    catat("rapor", false, r.durasiMs, {}, r.kode);
    return r;
  }
  const h = parseRapor(r.hasil.baris, k.mapel);
  const sukses = Object.keys(h.nilai).length > 0;
  catat("rapor", sukses, r.hasil.durasiMs, Object.fromEntries(Object.entries(h.nilai).map(([kode, s]) => [kode, s.keyakinan])));
  return sukses ? { ok: true, hasil: h, durasiMs: r.hasil.durasiMs } : { ok: false, kode: "gagal" };
}

/** Pesan ramah untuk pendaftar saat OCR tidak bisa dipakai (PRD 11.5): selalu mengarah ke isi manual. */
export function pesanGagalOcr(kode: KodeGalatOcr, berkasPdf: boolean): string {
  if (berkasPdf || kode === "tidak_didukung") return "Dokumen ini tidak dibaca otomatis. Silakan isi data secara manual pada kolom yang tersedia.";
  if (kode === "waktu_habis") return "Pembacaan dokumen terlalu lama dan dihentikan. Silakan isi data secara manual, atau coba lagi dengan foto yang lebih jelas.";
  return "Dokumen kurang jelas sehingga tidak dapat dibaca otomatis. Silakan isi data secara manual, atau ambil foto ulang dengan cahaya cukup dan tidak miring.";
}
