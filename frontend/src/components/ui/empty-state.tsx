import type { ReactNode } from "react";
import { TrayIcon } from "@phosphor-icons/react/dist/ssr";

type EmptyStateProps = {
  judul: string;
  deskripsi?: string;
  ikon?: ReactNode;
  aksi?: ReactNode;
};

export function EmptyState({ judul, deskripsi, ikon, aksi }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-kartu border border-dashed border-garis px-6 py-10 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-permukaan-alt text-primer-tua">
        {ikon ?? <TrayIcon aria-hidden weight="duotone" className="size-6" />}
      </div>
      <h3 className="text-lg font-bold text-tinta">{judul}</h3>
      {deskripsi && <p className="max-w-sm text-tinta-redup">{deskripsi}</p>}
      {aksi && <div className="mt-2">{aksi}</div>}
    </div>
  );
}
