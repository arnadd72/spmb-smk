"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, DownloadSimpleIcon, PrinterIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function AksiSukses({ nomor, token }: { nomor: string; token: string }) {
  const [tersalin, setTersalin] = useState(false);

  async function salin() {
    try {
      await navigator.clipboard.writeText(nomor);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      // Izin papan klip ditolak: nomor tetap tampil besar di halaman untuk disalin manual.
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row print:hidden">
      <Button varian="sekunder" onClick={salin} penuhMobile>
        {tersalin ? <CheckIcon aria-hidden weight="bold" className="size-5" /> : <CopyIcon aria-hidden className="size-5" />}
        <span aria-live="polite">{tersalin ? "Nomor tersalin" : "Salin nomor"}</span>
      </Button>
      <a
        href={`/api/v1/pendaftar/${token}/formulir?unduh=1`}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-kontrol bg-primer px-4 text-sm font-semibold text-primer-tinta hover:bg-primer-tua sm:w-auto"
      >
        <DownloadSimpleIcon aria-hidden className="size-5" />
        Unduh formulir (PDF)
      </a>
      <a
        href={`/api/v1/pendaftar/${token}/formulir`}
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-kontrol border border-primer px-4 text-sm font-semibold text-primer-tua hover:bg-permukaan-alt sm:w-auto"
      >
        <PrinterIcon aria-hidden className="size-5" />
        Buka untuk dicetak
      </a>
      <Button varian="hantu" onClick={() => window.print()} penuhMobile>
        Cetak halaman ini
      </Button>
    </div>
  );
}
