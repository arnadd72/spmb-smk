"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowCounterClockwiseIcon, ImageIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { FotoTambahanHero } from "./foto-tambahan-hero";
import type { BarisAset, DaftarAset } from "@/server/types/aset";

const pesanGalat = (e: unknown) =>
  e instanceof ApiError
    ? (e.errors?.berkas?.[0] ?? e.errors?.url?.[0] ?? e.message)
    : "Tidak dapat terhubung ke server.";

/** `anak` tampil di bawah isi kartu; kartu yang punya `anak` dibuat selebar baris (Foto utama beranda beserta foto tambahannya). */
function KartuAset({
  aset,
  onUbah,
  anak,
}: {
  aset: BarisAset;
  onUbah: () => Promise<void>;
  anak?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string>();

  async function ganti(f: File | undefined) {
    if (!f) return;
    setSibuk(true);
    setGalat(undefined);
    try {
      const form = new FormData();
      form.set("berkas", f);
      form.set("kategori", aset.kunci === "logo" ? "logo" : aset.kunci === "hero" ? "hero" : "jurusan");
      const { url } = await apiFetch<{ url: string }>("/admin/media", {
        method: "POST",
        body: form,
      });
      await apiFetch(`/admin/aset/${aset.kunci}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      await onUbah();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
      if (input.current) input.current.value = "";
    }
  }

  async function kembalikan() {
    setSibuk(true);
    setGalat(undefined);
    try {
      await apiFetch(`/admin/aset/${aset.kunci}`, { method: "DELETE" });
      await onUbah();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <li
      className={`flex flex-col gap-4 rounded-kartu border border-garis bg-permukaan p-4 ${anak ? "sm:col-span-2 lg:col-span-3" : ""}`}
      data-aset={aset.kunci}
    >
      <div className={anak ? "flex flex-col gap-4 sm:flex-row" : "contents"}>
        <div
          className={`grid h-36 place-items-center overflow-hidden rounded-kontrol bg-permukaan-alt ${anak ? "sm:h-44 sm:w-80 sm:shrink-0" : ""}`}
        >
          {aset.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- pratinjau alamat pilihan admin
            <img
              src={aset.url}
              alt={`Foto saat ini: ${aset.label}`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-tinta-redup">
              <ImageIcon aria-hidden className="size-4" />
              Belum ada foto.
            </p>
          )}
        </div>
        <div className={anak ? "flex flex-1 flex-col gap-3" : "contents"}>
          <div>
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-ink">{aset.label}</p>
              {aset.diganti ? (
                <Badge nada="sukses">Diganti</Badge>
              ) : (
                <Badge nada="netral">Bawaan</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-tinta-redup">{aset.bantuan}</p>
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button
              type="button"
              varian="sekunder"
              memuat={sibuk}
              onClick={() => input.current?.click()}
              aria-label={`Ganti foto: ${aset.label}`}
            >
              <UploadSimpleIcon aria-hidden className="size-5" />
              Ganti foto
            </Button>
            {aset.diganti && (
              <Button
                type="button"
                varian="hantu"
                disabled={sibuk}
                onClick={kembalikan}
                aria-label={`Kembalikan ke foto bawaan: ${aset.label}`}
              >
                <ArrowCounterClockwiseIcon aria-hidden className="size-5" />
                Kembalikan ke bawaan
              </Button>
            )}
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label={`Pilih foto pengganti: ${aset.label}`}
              data-ganti-aset={aset.kunci}
              className="sr-only"
              onChange={(e) => ganti(e.target.files?.[0])}
            />
          </div>
          {galat && (
            <p role="alert" className="text-sm font-medium text-bahaya">
              {galat}
            </p>
          )}
        </div>
      </div>
      {anak}
    </li>
  );
}

/**
 * Foto yang tampil di situs dan sebelumnya tertulis tetap di kode: logo, foto utama beranda, foto tiap jurusan.
 * Dipakai di halaman Foto Beranda; tawaran memuat foto galeri bawaan ada di halaman Galeri (muat-galeri-bawaan.tsx).
 */
export function PanelAsetSitus({ awal }: { awal: DaftarAset }) {
  const [daftar, setDaftar] = useState(awal);

  async function segarkan() {
    setDaftar(await apiFetch<DaftarAset>("/admin/aset"));
  }

  return (
    <section
      aria-labelledby="judul-foto-situs"
      className="mt-8 rounded-kartu border border-garis bg-permukaan-alt/50 p-4 sm:p-6"
    >
      <h2 id="judul-foto-situs" className="text-xl font-bold text-ink">
        Foto situs
      </h2>
      <p className="mt-1 max-w-prose text-sm text-tinta-redup">
        Foto yang tampil tetap di situs. Ganti dengan foto Anda sendiri (JPG, PNG, atau WebP,
        maksimal 5 MB); gambar dikompres otomatis supaya ringan tetapi tetap jelas. Perubahan
        langsung tampil di situs.
      </p>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Foto utama beranda di depan, selebar baris, karena memuat daftar foto tambahan slideshow. */}
        {[
          ...daftar.data.filter((a) => a.kunci === "hero"),
          ...daftar.data.filter((a) => a.kunci !== "hero"),
        ].map((a) => (
          <KartuAset
            key={a.kunci}
            aset={a}
            onUbah={segarkan}
            anak={a.kunci === "hero" ? <FotoTambahanHero /> : undefined}
          />
        ))}
      </ul>
    </section>
  );
}
