"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ListIcon, SignOutIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

// Menu admin sesuai PRD 13. Pembatasan per peran dikerjakan di M2/M6.
const grup = [
  { nama: "Utama", item: ["Dashboard", "Data Peserta", "Verifikasi"] },
  { nama: "Aksi", item: ["Ekspor XLSX", "Kuota", "Input Manual"] },
  { nama: "Konten", item: ["Berita", "Agenda", "Galeri", "Testimoni", "FAQ"] },
  {
    nama: "Sistem",
    item: [
      "Jurusan & Bobot",
      "Mata Pelajaran",
      "Isian Formulir",
      "Pengaturan",
      "Statistik OCR",
      "Akun Admin",
      "Audit Log",
    ],
  },
];

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "dan")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function Menu({ aktif, saatKlik }: { aktif?: string; saatKlik?: () => void }) {
  return (
    <nav aria-label="Menu admin" className="flex flex-col gap-5 p-4">
      {grup.map((g) => (
        <div key={g.nama}>
          <p className="px-3 text-xs font-bold uppercase tracking-wide text-tinta-redup">{g.nama}</p>
          <ul className="mt-1">
            {g.item.map((i) => (
              <li key={i}>
                <Link
                  href={`/admin/${slug(i)}`}
                  onClick={saatKlik}
                  aria-current={aktif === i ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-kontrol px-3 text-sm font-semibold text-tinta hover:bg-permukaan-alt",
                    aktif === i && "bg-sukses-latar text-primer-tua",
                  )}
                >
                  {i}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({
  children,
  aktif,
  nama = "Panitia SPMB",
}: {
  children: ReactNode;
  aktif?: string;
  nama?: string;
}) {
  const [buka, setBuka] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-garis bg-permukaan lg:block">
        <p className="border-b border-garis p-4 font-display text-lg font-extrabold text-primer-tua">
          SPMB Admin
        </p>
        <Menu aktif={aktif} />
      </aside>

      {buka && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu admin">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-hijau-gelap/60"
            onClick={() => setBuka(false)}
          />
          <div className="relative h-full w-72 max-w-[85%] overflow-y-auto bg-permukaan">
            <div className="flex items-center justify-between border-b border-garis p-2 pl-4">
              <p className="font-display text-lg font-extrabold text-primer-tua">SPMB Admin</p>
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setBuka(false)}
                className="grid size-11 place-items-center rounded-kontrol hover:bg-permukaan-alt"
              >
                <XIcon aria-hidden className="size-5" />
              </button>
            </div>
            <Menu aktif={aktif} saatKlik={() => setBuka(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-garis bg-latar/95 px-2 backdrop-blur-sm lg:px-6">
          <button
            type="button"
            aria-label="Buka menu"
            onClick={() => setBuka(true)}
            className="grid size-11 place-items-center rounded-kontrol hover:bg-permukaan-alt lg:hidden"
          >
            <ListIcon aria-hidden className="size-6" />
          </button>
          <p className="ml-auto text-sm font-semibold text-tinta">{nama}</p>
          <button
            type="button"
            className="flex min-h-11 items-center gap-2 rounded-kontrol px-3 text-sm font-semibold text-tinta hover:bg-permukaan-alt"
          >
            <SignOutIcon aria-hidden className="size-5" />
            Keluar
          </button>
        </header>
        <main id="konten" className="min-w-0 flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
