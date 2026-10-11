"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, PrinterIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function AksiSukses({ nomor }: { nomor: string }) {
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
      <Button varian="hantu" onClick={() => window.print()} penuhMobile>
        <PrinterIcon aria-hidden className="size-5" />
        Cetak halaman
      </Button>
    </div>
  );
}
