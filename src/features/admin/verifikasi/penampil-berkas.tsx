"use client";

import { useRef, useState } from "react";
import { ArrowsOutIcon, ArrowClockwiseIcon, DownloadSimpleIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export type BerkasTampil = {
  kunci: string;
  indeks: number;
  label: string;
  nama: string;
  mime: string;
  ukuran: number;
  sumber: "drive" | "sementara" | "cloudinary" | "hilang";
};

const SUMBER = {
  drive: { teks: "Tersimpan di Google Drive", nada: "sukses" },
  sementara: { teks: "Menunggu unggah ke Drive", nada: "peringatan" },
  cloudinary: { teks: "Tersimpan di Cloudinary (privat)", nada: "sukses" },
  hilang: { teks: "Berkas tidak tersedia", nada: "bahaya" },
} as const;

const tombol =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-kontrol border border-garis bg-permukaan px-3 text-sm font-semibold text-tinta hover:bg-permukaan-alt disabled:opacity-50";

/** Penampil berkas pendaftar: gambar (zoom, putar, layar penuh) dan PDF. Berkas diambil lewat backend. */
export function PenampilBerkas({ id, berkas }: { id: string; berkas: BerkasTampil[] }) {
  const [aktif, setAktif] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [putar, setPutar] = useState(0);
  const kotak = useRef<HTMLDivElement>(null);

  if (berkas.length === 0) {
    return <p className="rounded-kartu border border-dashed border-garis p-6 text-center text-tinta-redup">Pendaftar ini tidak mengunggah berkas.</p>;
  }

  const b = berkas[Math.min(aktif, berkas.length - 1)];
  const url = `/api/v1/admin/peserta/${id}/berkas?kunci=${encodeURIComponent(b.kunci)}&i=${b.indeks}`;
  const gambar = b.mime.startsWith("image/");
  const s = SUMBER[b.sumber];

  function pilih(i: number) {
    setAktif(i);
    setZoom(1);
    setPutar(0);
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Berkas pendaftar" className="flex flex-wrap gap-2">
        {berkas.map((x, i) => (
          <button
            key={`${x.kunci}-${x.indeks}`}
            role="tab"
            type="button"
            aria-selected={i === aktif}
            onClick={() => pilih(i)}
            className={cn(
              "min-h-11 rounded-kontrol border px-3 text-sm font-semibold",
              i === aktif ? "border-primer bg-sukses-latar text-primer-tua" : "border-garis bg-permukaan text-tinta hover:bg-permukaan-alt",
            )}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge nada={s.nada}>{s.teks}</Badge>
        {b.sumber !== "hilang" && gambar && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Kontrol gambar">
            <button type="button" className={tombol} onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Perkecil">
              <MagnifyingGlassMinusIcon aria-hidden className="size-5" />
            </button>
            <button type="button" className={tombol} onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} aria-label="Perbesar">
              <MagnifyingGlassPlusIcon aria-hidden className="size-5" />
            </button>
            <button type="button" className={tombol} onClick={() => setPutar((r) => (r + 90) % 360)} aria-label="Putar 90 derajat">
              <ArrowClockwiseIcon aria-hidden className="size-5" />
            </button>
            <button type="button" className={tombol} onClick={() => kotak.current?.requestFullscreen?.()} aria-label="Layar penuh">
              <ArrowsOutIcon aria-hidden className="size-5" />
            </button>
          </div>
        )}
        {b.sumber !== "hilang" && (
          <a href={`${url}&unduh=1`} className={tombol}>
            <DownloadSimpleIcon aria-hidden className="size-5" />
            Unduh
          </a>
        )}
      </div>

      <div ref={kotak} role="tabpanel" tabIndex={0} aria-label={b.label} className="h-[min(70dvh,46rem)] overflow-auto rounded-kartu border border-garis bg-permukaan-alt">
        {b.sumber === "hilang" ? (
          <p className="p-6 text-center text-tinta-redup">Berkas tidak ditemukan di penyimpanan. Coba sinkron ulang ke Drive atau minta pendaftar mengunggah ulang.</p>
        ) : gambar ? (
          <div className="grid min-h-full min-w-full place-items-center p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- berkas dinamis dari API backend, bukan aset statis */}
            <img
              src={url}
              alt={`${b.label}: ${b.nama}`}
              className="max-w-none origin-center transition-transform"
              style={{ transform: `rotate(${putar}deg) scale(${zoom})`, width: "min(100%, 40rem)" }}
            />
          </div>
        ) : (
          <iframe src={url} title={`${b.label}: ${b.nama}`} className="size-full" />
        )}
      </div>
    </div>
  );
}
