"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

type DialogProps = {
  buka: boolean;
  onBukaChange: (buka: boolean) => void;
  judul: string;
  deskripsi?: string;
  children?: ReactNode;
  aksi?: ReactNode;
};

export function Dialog({ buka, onBukaChange, judul, deskripsi, children, aksi }: DialogProps) {
  return (
    <RadixDialog.Root open={buka} onOpenChange={onBukaChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-hijau-gelap/60 data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <RadixDialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[85dvh] max-w-lg -translate-y-1/2 overflow-y-auto rounded-kartu border border-garis bg-permukaan p-6 shadow-kartu data-[state=open]:animate-[fade-in_200ms_ease-out]">
          <RadixDialog.Title className="font-display text-xl font-bold text-tinta">{judul}</RadixDialog.Title>
          {deskripsi ? (
            <RadixDialog.Description className="mt-2 text-tinta-redup">{deskripsi}</RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{judul}</RadixDialog.Description>
          )}
          {children && <div className="mt-4">{children}</div>}
          {aksi && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{aksi}</div>}
          <RadixDialog.Close
            aria-label="Tutup"
            className="absolute right-3 top-3 grid size-11 place-items-center rounded-kontrol text-tinta-redup hover:bg-permukaan-alt"
          >
            <XIcon aria-hidden className="size-5" />
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
