"use client";

import { useState } from "react";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { periksaAngka, saringAngka, type AturanAngka } from "./schema-client";

// Peringatan angka langsung saat mengetik (NIK, Nomor KK, NISN, nomor telepon): muncul tanpa menekan simpan atau lanjut,
// berubah menjadi tanda benar begitu jumlah digitnya sesuai. Huruf dan tanda yang diketik tidak diterima dan diberi tahu.

type Dibuang = "huruf" | "kelebihan" | null;

/** Status isian angka: nilai yang sudah disaring, pemantau isian, dan props untuk <Input>. Dipakai kolom formulir dan kartu OCR. */
export function useIsianAngka(aturan: AturanAngka | null, nilai: string, ubah: (nilaiBaru: string) => void) {
  const [dibuang, setDibuang] = useState<Dibuang>(null);
  const status = aturan ? periksaAngka(aturan, nilai) : null;
  return {
    status,
    dibuang,
    /** Saring ketikan atau tempelan: hanya angka, dipotong ke panjang maksimum. */
    saatUbah: (mentah: string) => {
      if (!aturan) return ubah(mentah);
      const s = saringAngka(aturan, mentah);
      setDibuang(s.hurufDibuang ? "huruf" : s.kelebihan ? "kelebihan" : null);
      ubah(s.nilai);
    },
    /** Props untuk <Input>: tanpa maxLength (huruf dan spasi ikut terhitung di sana), numerik, dan ditandai tidak valid selama kurang. */
    propsInput: aturan
      ? ({ inputMode: "numeric", ...(status?.status === "kurang" ? { "aria-invalid": true } : {}) } as const)
      : ({} as const),
  };
}

export function PesanAngka({ aturan, status, dibuang }: { aturan: AturanAngka; status: ReturnType<typeof periksaAngka>; dibuang: Dibuang }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-0.5 text-sm font-medium empty:hidden">
      {status.status === "kurang" && (
        <p className="flex items-start gap-1.5 text-peringatan">
          <WarningCircleIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
          {status.pesan}
        </p>
      )}
      {status.status === "benar" && (
        <p className="flex items-start gap-1.5 text-sukses">
          <CheckCircleIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
          {status.pesan}
        </p>
      )}
      {dibuang === "huruf" && (
        <p className="flex items-start gap-1.5 text-peringatan">
          <WarningCircleIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
          Hanya angka yang diterima. Huruf, spasi, dan tanda dihapus.
        </p>
      )}
      {dibuang === "kelebihan" && (
        <p className="flex items-start gap-1.5 text-peringatan">
          <WarningCircleIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
          Maksimal {aturan.max} digit. Kelebihan digit dihapus.
        </p>
      )}
    </div>
  );
}
