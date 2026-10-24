"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { HURUF_MINAT, JURUSAN_MINAT, SOAL_MINAT, poinMinat, type JawabanMinat } from "./schema-client";

const TAMPILAN: Record<(typeof JURUSAN_MINAT)[number], { nama: string; warna: string }> = {
  MPLB: { nama: "Manajemen Perkantoran dan Layanan Bisnis", warna: "bg-mint" },
  AKL: { nama: "Akuntansi dan Keuangan Lembaga", warna: "bg-primer" },
  LPK3: { nama: "Farmasi", warna: "bg-jurusan-lpk3" },
  TKR: { nama: "Teknik Kendaraan Ringan", warna: "bg-jurusan-tkr" },
};
const PERTANYAAN = SOAL_MINAT;
const HURUF = HURUF_MINAT;
const kosong = (): JawabanMinat => Array(PERTANYAAN.length).fill(null);

/**
 * Tes minat bakat satu soal per layar. Di halaman publik berdiri sendiri; di langkah 3 wizard diberi `awal` (jawaban
 * tersimpan di draf) dan `onUbah` agar jawaban ikut disimpan untuk saran jurusan di langkah 4.
 */
export function TesMinatBakat({ awal, onUbah }: { awal?: JawabanMinat; onUbah?: (jawaban: JawabanMinat) => void } = {}) {
  const [jawaban, setJawabanLokal] = useState<JawabanMinat>(() => (awal && awal.length === PERTANYAAN.length ? awal : kosong()));
  // Draf yang sudah berisi jawaban dibuka di soal pertama yang belum dijawab, atau langsung di hasil bila lengkap.
  const [langkah, setLangkah] = useState(() => Math.max(0, jawaban.findIndex((x) => x === null)));
  const [lihatHasil, setLihatHasil] = useState(() => jawaban.every((x) => x !== null));
  const poin = poinMinat(jawaban);
  const skor = JURUSAN_MINAT.map((kode) => ({ kode, ...TAMPILAN[kode], poin: poin[kode] })).sort((a, b) => b.poin - a.poin);
  const tertinggi = skor[0].poin;
  const jumlahTertinggi = skor.filter((x) => x.poin === tertinggi).length;

  function setJawaban(baru: JawabanMinat) {
    setJawabanLokal(baru);
    onUbah?.(baru);
  }

  function jawab(indeks: number) {
    setJawaban(jawaban.map((nilai, i) => (i === langkah ? indeks : nilai)));
  }

  function lanjut() {
    if (jawaban[langkah] === null) return;
    if (langkah === PERTANYAAN.length - 1) setLihatHasil(true);
    else setLangkah((sebelumnya) => sebelumnya + 1);
  }

  function ulangi() {
    setJawaban(kosong());
    setLangkah(0);
    setLihatHasil(false);
  }

  return (
        <div id="tes-minat-bakat" className="rounded-kartu bg-permukaan p-5 text-ink shadow-kartu sm:p-8">
          {lihatHasil ? (
            <div aria-live="polite">
              <h3 className="text-xl font-bold text-ink">Hasil minatmu</h3>
              <p className="mt-2 text-sm text-tinta-redup">Poin dihitung dari jawabanmu. Nilai seri ditampilkan sebagai rekomendasi setara.</p>
              <ol className="mt-6 flex flex-col gap-5">
                {skor.map((jurusan) => {
                  const utama = jurusan.poin === tertinggi;
                  return (
                    <li key={jurusan.kode}>
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-xl font-bold">{jurusan.kode}</p>
                          <p className="text-sm text-tinta-redup">{jurusan.nama}</p>
                        </div>
                        <p className="angka shrink-0 font-bold">{jurusan.poin} poin</p>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-permukaan-alt">
                        <div className={cn("h-full rounded-full", jurusan.warna)} style={{ width: `${(jurusan.poin / PERTANYAAN.length) * 100}%` }} />
                      </div>
                      <p className={cn("mt-1 text-sm font-semibold", utama ? "text-primer-tua" : "text-tinta-redup")}>
                        {utama ? (jumlahTertinggi > 1 ? "Rekomendasi setara" : "Minat paling banyak") : "Alternatif"}
                      </p>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-6 flex flex-wrap gap-3 border-t border-garis pt-5">
                <Button type="button" varian="sekunder" onClick={() => setLihatHasil(false)}>
                  Ubah jawaban
                </Button>
                <Button type="button" onClick={ulangi}>
                  Ulangi tes
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-tinta">Pertanyaan {langkah + 1} dari {PERTANYAAN.length}</p>
                <p className="text-sm text-tinta-redup">{Math.round(((langkah + 1) / PERTANYAAN.length) * 100)}%</p>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-permukaan-alt"
                role="progressbar"
                aria-label="Kemajuan tes"
                aria-valuemin={0}
                aria-valuemax={PERTANYAAN.length}
                aria-valuenow={langkah + 1}
              >
                <div className="h-full rounded-full bg-primer transition-[width]" style={{ width: `${((langkah + 1) / PERTANYAAN.length) * 100}%` }} />
              </div>
              <fieldset className="mt-6">
                <legend className="text-lg font-bold leading-snug text-ink sm:text-xl">{PERTANYAAN[langkah].teks}</legend>
                <div className="mt-4 flex flex-col gap-2">
                  {PERTANYAAN[langkah].opsi.map((opsi, indeks) => (
                    <label
                      key={opsi}
                      className={cn(
                        "flex min-h-12 cursor-pointer items-start gap-3 rounded-kontrol border px-3 py-3 text-sm transition-colors",
                        jawaban[langkah] === indeks ? "border-primer bg-mint/50" : "border-garis bg-permukaan hover:bg-permukaan-alt",
                      )}
                    >
                      <input
                        type="radio"
                        name={`pertanyaan-${langkah}`}
                        value={indeks}
                        checked={jawaban[langkah] === indeks}
                        onChange={() => jawab(indeks)}
                        className="mt-0.5 size-4 shrink-0 accent-primer"
                      />
                      <span>
                        <span className="mr-1.5 font-bold">{HURUF[indeks]}.</span>
                        {opsi}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-garis pt-5">
                <Button type="button" varian="sekunder" onClick={() => setLangkah((sebelumnya) => Math.max(0, sebelumnya - 1))} disabled={langkah === 0}>
                  Sebelumnya
                </Button>
                <Button type="button" onClick={lanjut} disabled={jawaban[langkah] === null}>
                  {langkah === PERTANYAAN.length - 1 ? "Lihat hasil" : "Lanjut"}
                </Button>
              </div>
            </>
          )}
        </div>
  );
}
