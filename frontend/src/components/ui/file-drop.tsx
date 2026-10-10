"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { FileIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

type FileDropProps = {
  label: string;
  /** Batas MB (PRD 10.4: 5 MB). */
  maksMB?: number;
  terima?: string;
  /** Buka kamera belakang di HP. */
  kamera?: boolean;
  galat?: string;
  onPilih?: (berkas: File | null) => void;
};

function formatUkuran(byte: number): string {
  return byte >= 1024 * 1024 ? `${(byte / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(byte / 1024)} KB`;
}

export function FileDrop({
  label,
  maksMB = 5,
  terima = "image/jpeg,image/png,image/webp,application/pdf",
  kamera = false,
  galat,
  onPilih,
}: FileDropProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [galatLokal, setGalatLokal] = useState<string>();
  const [seret, setSeret] = useState(false);
  const pesan = galat ?? galatLokal;

  function terimaBerkas(f: File | null | undefined) {
    if (!f) return;
    if (f.size > maksMB * 1024 * 1024) {
      setGalatLokal(`Ukuran berkas ${formatUkuran(f.size)} melebihi batas ${maksMB} MB.`);
      return;
    }
    setGalatLokal(undefined);
    setBerkas(f);
    onPilih?.(f);
  }

  function hapus() {
    setBerkas(null);
    setGalatLokal(undefined);
    if (input.current) input.current.value = "";
    onPilih?.(null);
  }

  function saatLepas(e: DragEvent) {
    e.preventDefault();
    setSeret(false);
    terimaBerkas(e.dataTransfer.files[0]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-semibold text-tinta">
        {label}
      </span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setSeret(true);
        }}
        onDragLeave={() => setSeret(false)}
        onDrop={saatLepas}
        className={cn(
          "flex flex-col items-center gap-3 rounded-kartu border-2 border-dashed p-5 text-center transition-colors",
          seret ? "border-primer bg-sukses-latar" : "border-garis bg-permukaan",
          pesan && "border-bahaya",
        )}
      >
        {berkas ? (
          <div className="flex w-full items-center gap-3 text-left">
            <FileIcon aria-hidden weight="duotone" className="size-8 shrink-0 text-primer" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-tinta">{berkas.name}</p>
              <p className="angka text-sm text-tinta-redup">{formatUkuran(berkas.size)}</p>
            </div>
            <Button varian="hantu" onClick={hapus} aria-label={`Hapus ${berkas.name}`}>
              <TrashIcon aria-hidden className="size-5" />
            </Button>
          </div>
        ) : (
          <>
            <UploadSimpleIcon aria-hidden weight="duotone" className="size-8 text-primer" />
            <p className="text-tinta-redup">
              Seret berkas ke sini atau pilih dari perangkat. JPG, PNG, WebP, atau PDF, maksimal{" "}
              <span className="angka">{maksMB}</span> MB.
            </p>
            <Button varian="sekunder" onClick={() => input.current?.click()}>
              {kamera ? "Ambil foto atau pilih berkas" : "Pilih berkas"}
            </Button>
          </>
        )}
        <input
          ref={input}
          id={id}
          type="file"
          accept={terima}
          capture={kamera ? "environment" : undefined}
          aria-labelledby={`${id}-label`}
          aria-describedby={pesan ? `${id}-galat` : undefined}
          className="sr-only"
          onChange={(e) => terimaBerkas(e.target.files?.[0])}
        />
      </div>
      {pesan && (
        <p id={`${id}-galat`} role="alert" className="text-sm font-medium text-bahaya">
          {pesan}
        </p>
      )}
    </div>
  );
}
