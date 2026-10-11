"use client";

import { useRef, useState } from "react";
import { ImageIcon, UploadSimpleIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";

/** Isian gambar: tempel alamat atau unggah berkas (JPG, PNG, WebP, maks 5 MB). Pratinjau tampil di bawahnya. */
export function UnggahGambar({ nilai, onChange }: { nilai: string; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string>();

  async function unggah(f: File | undefined) {
    if (!f) return;
    setSibuk(true);
    setGalat(undefined);
    try {
      const form = new FormData();
      form.set("berkas", f);
      const { url } = await apiFetch<{ url: string }>("/admin/media", { method: "POST", body: form });
      onChange(url);
    } catch (e) {
      setGalat(e instanceof ApiError ? (e.errors?.berkas?.[0] ?? e.message) : "Tidak dapat terhubung ke server.");
    } finally {
      setSibuk(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={nilai} onChange={(e) => onChange(e.target.value)} placeholder="/images/... atau https://..." />
        <Button type="button" varian="sekunder" memuat={sibuk} onClick={() => input.current?.click()} className="shrink-0">
          <UploadSimpleIcon aria-hidden className="size-5" />
          Unggah gambar
        </Button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Pilih gambar untuk diunggah" data-unggah-gambar className="sr-only" onChange={(e) => unggah(e.target.files?.[0])} />
      </div>
      {galat && (
        <p role="alert" className="text-sm font-medium text-bahaya">
          {galat}
        </p>
      )}
      {nilai ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau alamat bebas dari admin */}
          <img src={nilai} alt="Pratinjau gambar" className="h-20 w-32 rounded-kontrol border border-garis object-cover" />
          <Button type="button" varian="hantu" onClick={() => onChange("")}>
            <XIcon aria-hidden className="size-4" />
            Hapus gambar
          </Button>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-sm text-tinta-redup">
          <ImageIcon aria-hidden className="size-4" />
          Belum ada gambar.
        </p>
      )}
    </div>
  );
}
