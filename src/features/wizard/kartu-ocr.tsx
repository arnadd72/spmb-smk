"use client";

import { InfoIcon } from "@phosphor-icons/react";
import { BadgeKeyakinan } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SkeletonProses } from "@/components/ui/skeleton";
import type { Tahap } from "@/lib/ocr/mesin";
import type { Keyakinan } from "@/lib/ocr/tipe";
import { NAMA_TAHAP } from "./ocr";
import { CONTOH_ISIAN_OCR, LABEL_ISIAN_OCR, OPSI_JENIS_KELAMIN, type Saran } from "./ocr-isian";

export type StatusBaca = { status: "membaca"; tahap?: Tahap } | { status: "gagal"; pesan: string } | { status: "selesai" };

/** Status satu pembacaan: skeleton saat membaca, pesan ramah (mengarah ke isi manual) saat gagal. */
export function StatusOcr({ s }: { s: StatusBaca | undefined }) {
  if (!s || s.status === "selesai") return null;
  if (s.status === "membaca") return <SkeletonProses teks={NAMA_TAHAP[s.tahap ?? "siapkan"]} />;
  return (
    <p role="status" className="flex items-start gap-2 rounded-kontrol bg-info-latar px-3 py-2.5 text-sm font-medium text-info">
      <InfoIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
      {s.pesan}
    </p>
  );
}

type KartuProps = {
  judul: string;
  /** Kunci yang ditampilkan kartu ini, berurutan. */
  kunci: readonly string[];
  saran: Saran;
  suntingan: Record<string, string>;
  /** Nilai yang dipulihkan dari draf (tanpa lencana keyakinan). */
  awal: Record<string, string>;
  peringatan: string[];
  /** Dokumen gagal dibaca: tampilkan semua kolom kosong supaya pendaftar mengisi sendiri. */
  gagal?: boolean;
  onUbah: (kunci: string, nilai: string) => void;
};

/** Hasil baca Akta atau KK yang bisa diedit, dengan lencana keyakinan (PRD v3.1 10.4 langkah 2). */
export function KartuIsianOcr({ judul, kunci, saran, suntingan, awal, peringatan, gagal, onUbah }: KartuProps) {
  const terbaca = kunci.filter((k) => saran[k] || awal[k] || suntingan[k]);
  const hilang = kunci.filter((k) => !terbaca.includes(k)).map((k) => LABEL_ISIAN_OCR[k]);
  if (terbaca.length === 0 && peringatan.length === 0 && !gagal) return null;
  // Kolom yang tidak terbaca tetap ditampilkan kosong agar bisa diisi manual di sini.
  const tampil = gagal || terbaca.length > 0 ? kunci : terbaca;

  return (
    <section aria-label={judul} className="flex flex-col gap-3 rounded-kartu border border-garis bg-permukaan p-4">
      <div>
        <h3 className="text-base font-bold text-ink">{judul}</h3>
        <p className="mt-0.5 text-sm text-tinta-redup">
          {gagal
            ? "Dokumen tidak terbaca otomatis, tidak masalah. Berkas Anda sudah tersimpan; isi data di bawah ini secara manual."
            : "Hasil ini dibaca otomatis dan bisa saja keliru, termasuk yang bertanda Terdeteksi. Pastikan setiap isian sudah sama dengan dokumen Anda, lalu perbaiki bila perlu. Data ini akan mengisi langkah berikutnya."}
        </p>
      </div>

      {peringatan.map((p) => (
        <p key={p} role="status" className="rounded-kontrol bg-peringatan-latar px-3 py-2 text-sm font-medium text-peringatan">
          {p}
        </p>
      ))}

      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {tampil.map((k) => {
          const nilai = suntingan[k] ?? saran[k]?.nilai ?? awal[k] ?? "";
          const keyakinan = saran[k]?.keyakinan as Keyakinan | undefined;
          const diubah = suntingan[k] !== undefined && suntingan[k] !== (saran[k]?.nilai ?? awal[k] ?? "");
          return (
            <div key={k} className="flex flex-col gap-1.5">
              <Field label={LABEL_ISIAN_OCR[k]} bantuan={CONTOH_ISIAN_OCR[k]}>
                {k === "jenis_kelamin" ? (
                  <Select name={`ocr_${k}`} opsi={OPSI_JENIS_KELAMIN} nilai={nilai || undefined} onChange={(v) => onUbah(k, v)} />
                ) : (
                  <Input
                    name={`ocr_${k}`}
                    value={nilai}
                    inputMode={k === "nik" || k === "no_kk" || k === "rt" || k === "rw" ? "numeric" : undefined}
                    onChange={(e) => onUbah(k, e.target.value.toLocaleUpperCase("id-ID"))}
                  />
                )}
              </Field>
              {keyakinan && keyakinan !== "NOT_FOUND" && !diubah && <BadgeKeyakinan level={keyakinan === "HIGH" ? "HIGH" : "MEDIUM"} />}
            </div>
          );
        })}
      </div>

      {!gagal && hilang.length > 0 && terbaca.length > 0 && (
        <p className="text-sm text-tinta-redup">Tidak terbaca: {hilang.join(", ")}. Silakan isi manual pada kolom kosong di atas.</p>
      )}
    </section>
  );
}
