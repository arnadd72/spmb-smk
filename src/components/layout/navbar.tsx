"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ListIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const tautan = [
  { href: "/", label: "Beranda" },
  { href: "/jurusan", label: "Jurusan" },
  { href: "/#alur-daftar", label: "Alur Daftar" },
  { href: "/berita", label: "Berita" },
  { href: "/#faq", label: "FAQ" },
  { href: "/cek-status", label: "Cek Status" },
];

export function Navbar() {
  const [buka, setBuka] = useState(false);

  useEffect(() => {
    document.body.style.overflow = buka ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [buka]);

  return (
    <header className="sticky top-0 z-30 border-b border-garis bg-latar/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3 font-display text-lg font-extrabold leading-none text-primer-tua">
          <Image src="/images/sekolah/lambang.png" alt="" width={40} height={40} className="size-10 object-contain" priority />
          <span>
            SMK Ma&apos;arif NU 1 Wangon
            <span className="mt-1 block text-xs font-semibold tracking-wide text-tinta-redup">SPMB</span>
          </span>
        </Link>

        <nav aria-label="Menu utama" className="hidden items-center gap-1 lg:flex">
          {tautan.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-kontrol px-3 py-2 text-sm font-semibold text-tinta hover:bg-permukaan-alt"
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/daftar/langkah/1" className="hidden sm:block">
            <Button>Daftar Sekarang</Button>
          </Link>
          <button
            type="button"
            aria-expanded={buka}
            aria-controls="menu-mobile"
            aria-label={buka ? "Tutup menu" : "Buka menu"}
            onClick={() => setBuka((b) => !b)}
            className="grid size-11 place-items-center rounded-kontrol text-tinta hover:bg-permukaan-alt lg:hidden"
          >
            {buka ? <XIcon aria-hidden className="size-6" /> : <ListIcon aria-hidden className="size-6" />}
          </button>
        </div>
      </div>

      {buka && (
        <div
          id="menu-mobile"
          className="fixed inset-x-0 bottom-0 top-16 z-20 overflow-y-auto bg-latar px-4 py-6 lg:hidden"
        >
          <nav aria-label="Menu utama" className="flex flex-col">
            {tautan.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                onClick={() => setBuka(false)}
                className="border-b border-garis py-4 font-display text-2xl font-bold text-tinta"
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <Link href="/daftar/langkah/1" onClick={() => setBuka(false)} className="mt-6 block">
            <Button ukuran="lg" className="w-full">
              Daftar Sekarang
            </Button>
          </Link>
        </div>
      )}
    </header>
  );
}
