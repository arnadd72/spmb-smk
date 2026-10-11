"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { KeyIcon, ListIcon, SignOutIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { LABEL_PERAN, menuUntuk, type PeranMenu } from "./menu-admin";

function Menu({ peran, saatKlik }: { peran: PeranMenu; saatKlik?: () => void }) {
  const path = usePathname();
  const aktif = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));

  return (
    <nav aria-label="Menu admin" className="flex flex-col gap-5 p-4">
      {menuUntuk(peran).map((g) => (
        <div key={g.nama}>
          <p className="px-3 text-xs font-bold uppercase tracking-wide text-tinta-redup">{g.nama}</p>
          <ul className="mt-1">
            {g.item.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  onClick={saatKlik}
                  aria-current={aktif(i.href) ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-kontrol px-3 text-sm font-semibold text-tinta hover:bg-permukaan-alt",
                    aktif(i.href) && "bg-sukses-latar text-primer-tua",
                  )}
                >
                  {i.label}
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
  nama = "Panitia SPMB",
  peran = "panitia",
}: {
  children: ReactNode;
  nama?: string;
  peran?: PeranMenu;
}) {
  const [buka, setBuka] = useState(false);
  const router = useRouter();

  async function keluar() {
    await fetch("/api/v1/admin/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-garis bg-permukaan lg:sticky lg:top-0 lg:block lg:h-dvh lg:self-start lg:overflow-y-auto">
        <p className="border-b border-garis p-4 font-display text-lg font-extrabold text-primer-tua">
          SPMB Admin
        </p>
        <Menu peran={peran} />
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
            <Menu peran={peran} saatKlik={() => setBuka(false)} />
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
          <p className="ml-auto min-w-0 truncate text-sm font-semibold text-tinta">
            {nama} <span className="font-medium text-tinta-redup">· {LABEL_PERAN[peran]}</span>
          </p>
          <Link
            href="/admin/ganti-password"
            className="flex min-h-11 items-center gap-2 rounded-kontrol px-3 text-sm font-semibold text-tinta hover:bg-permukaan-alt"
          >
            <KeyIcon aria-hidden className="size-5" />
            <span className="hidden sm:inline">Ganti password</span>
            <span className="sr-only sm:hidden">Ganti password</span>
          </Link>
          <button
            type="button"
            onClick={keluar}
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
