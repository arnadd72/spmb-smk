import type { ReactNode } from "react";
import { Skeleton } from "./skeleton";

// Kerangka (skeleton) saat pindah halaman, dipakai file loading.tsx. Bentuknya meniru tata letak halaman aslinya
// supaya isi tidak melompat saat data tiba. Navbar, footer, dan sidebar admin tetap tampil karena berada di layout.

/** Pembungkus: diumumkan ke pembaca layar sebagai status memuat. */
function Memuat({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">Memuat halaman…</span>
      {children}
    </div>
  );
}

/** Judul halaman publik: dua baris besar dan satu paragraf pembuka. */
function JudulPublik() {
  return (
    <>
      <Skeleton className="h-10 w-3/4 max-w-xl lg:h-14" />
      <Skeleton className="mt-3 h-10 w-1/2 max-w-sm lg:h-14" />
      <Skeleton className="mt-6 h-5 w-full max-w-2xl" />
      <Skeleton className="mt-2 h-5 w-4/5 max-w-xl" />
    </>
  );
}

/** Halaman publik umum (beranda, tes minat bakat, cek pendaftaran, kebijakan privasi). */
export function KerangkaPublik() {
  return (
    <Memuat className="wadah py-12 lg:py-20">
      <JudulPublik />
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-12 w-full rounded-kontrol sm:w-44" />
        <Skeleton className="h-12 w-full rounded-kontrol sm:w-44" />
      </div>
      <Skeleton className="mt-10 aspect-[16/10] w-full rounded-kartu lg:aspect-[21/9]" />
    </Memuat>
  );
}

/** Daftar program keahlian: kartu besar dua kolom. */
export function KerangkaJurusan() {
  return (
    <Memuat className="wadah py-12 lg:py-20">
      <JudulPublik />
      <div className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="min-h-80 rounded-kartu" />
        ))}
      </div>
    </Memuat>
  );
}

/** Detail satu jurusan: kepala berwarna dengan foto, lalu kartu info. */
export function KerangkaDetailJurusan() {
  return (
    <Memuat>
      <div className="bg-permukaan-alt/60 py-12 lg:py-16">
        <div className="wadah grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-6 h-16 w-40 lg:h-24 lg:w-56" />
            <Skeleton className="mt-5 h-7 w-3/4" />
            <Skeleton className="mt-4 h-5 w-full" />
            <Skeleton className="mt-2 h-5 w-2/3" />
          </div>
          <Skeleton className="aspect-[16/10] w-full rounded-kartu" />
        </div>
      </div>
      <div className="wadah grid gap-5 py-12 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-kartu" />
        <Skeleton className="h-56 rounded-kartu" />
      </div>
    </Memuat>
  );
}

/** Daftar berita: kartu bergambar dua kolom dan kolom agenda di samping. */
export function KerangkaBerita() {
  return (
    <Memuat className="wadah py-12 lg:py-20">
      <Skeleton className="h-10 w-3/4 max-w-xl lg:h-14" />
      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <div className="grid gap-8 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[16/10] w-full rounded-kartu" />
              <Skeleton className="mt-4 h-4 w-28" />
              <Skeleton className="mt-2 h-7 w-5/6" />
              <Skeleton className="mt-2 h-4 w-full" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-7 w-32" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-kartu" />
          ))}
        </div>
      </div>
    </Memuat>
  );
}

/** Satu berita: judul, tanggal, gambar sampul, paragraf. */
export function KerangkaArtikel() {
  return (
    <Memuat className="wadah max-w-3xl py-12 lg:py-20">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-10 w-full lg:h-12" />
      <Skeleton className="mt-3 h-10 w-2/3 lg:h-12" />
      <Skeleton className="mt-8 aspect-[16/9] w-full rounded-kartu" />
      {["w-full", "w-full", "w-11/12", "w-full", "w-3/4"].map((w, i) => (
        <Skeleton key={i} className={`mt-3 h-5 ${w}`} />
      ))}
    </Memuat>
  );
}

/** Satu langkah wizard pendaftaran: bilah langkah, judul, dan beberapa isian. */
export function KerangkaLangkah() {
  return (
    <Memuat>
      <div className="border-b border-garis px-4 py-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-2 w-full rounded-full" />
      </div>
      <div className="px-4 py-8 sm:py-10">
        <Skeleton className="h-8 w-2/3" />
        <div className="mt-8 flex flex-col gap-6">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-12 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-between gap-3">
          <Skeleton className="h-12 w-28" />
          <Skeleton className="h-12 w-36" />
        </div>
      </div>
    </Memuat>
  );
}

/** Halaman panel admin: judul, bilah alat, dan tabel. */
export function KerangkaAdmin() {
  return (
    <Memuat className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-11 w-36" />
      </div>
      <Skeleton className="mt-6 h-11 w-full max-w-sm" />
      <div className="mt-6 overflow-hidden rounded-kartu border border-garis">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-garis px-4 py-4 last:border-b-0">
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="hidden h-5 w-24 sm:block" />
            <Skeleton className="h-9 w-20" />
          </div>
        ))}
      </div>
    </Memuat>
  );
}
