"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";

/**
 * Tawaran menyalin lima foto bawaan landing ke daftar galeri agar bisa diubah, diurutkan, atau dihapus.
 * Tampil di halaman Galeri sampai foto bawaan pernah dimuat.
 */
export function MuatGaleriBawaan({ bawaanDimuat }: { bawaanDimuat: boolean }) {
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string>();

  if (bawaanDimuat) return null;

  async function muat() {
    setSibuk(true);
    setGalat(undefined);
    try {
      await apiFetch("/admin/aset/galeri-bawaan", { method: "POST" });
      // Daftar galeri di bawah dimuat ulang bersama halaman.
      window.location.reload();
    } catch (e) {
      setGalat(e instanceof ApiError ? (e.errors?.galeri?.[0] ?? e.message) : "Tidak dapat terhubung ke server.");
      setSibuk(false);
    }
  }

  return (
    <div className="mt-6 rounded-kontrol border border-garis bg-permukaan p-4" data-galeri-bawaan>
      <p className="font-semibold text-ink">Beranda menampilkan 5 foto bawaan, lalu foto yang Anda tambahkan di galeri.</p>
      <p className="mt-1 text-sm text-tinta-redup">
        Muat foto bawaan itu ke daftar galeri di bawah bila ingin mengubah, mengurutkan, atau menghapusnya. Setelah dimuat, beranda menampilkan isi
        galeri saja.
      </p>
      <Button type="button" varian="sekunder" className="mt-3" memuat={sibuk} onClick={muat}>
        Muat foto bawaan situs ke galeri
      </Button>
      {galat && (
        <p role="alert" className="mt-2 text-sm font-medium text-bahaya">
          {galat}
        </p>
      )}
    </div>
  );
}
