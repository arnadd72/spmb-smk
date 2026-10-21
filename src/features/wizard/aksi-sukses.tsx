"use client";

import { useState, type ReactNode } from "react";
import { CheckIcon, CopyIcon, DownloadSimpleIcon, EyeIcon, PrinterIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const tautanUtama =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-kontrol bg-primer px-4 text-sm font-semibold text-primer-tinta hover:bg-primer-tua";
const tautanSekunder =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-kontrol border border-primer px-4 text-sm font-semibold text-primer-tua hover:bg-permukaan-alt";

/** Tombol salin di bawah nomor pendaftaran, dengan keterangan kegunaannya. */
export function SalinNomor({ nomor }: { nomor: string }) {
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
    <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4 print:hidden">
      <Button varian="sekunder" onClick={salin} penuhMobile>
        {tersalin ? <CheckIcon aria-hidden weight="bold" className="size-5" /> : <CopyIcon aria-hidden className="size-5" />}
        <span aria-live="polite">{tersalin ? "Nomor tersalin" : "Salin nomor"}</span>
      </Button>
      <p className="text-sm text-tinta-redup">Tempel nomor ini di catatan atau WhatsApp agar tidak lupa.</p>
    </div>
  );
}

function Aksi({ tombol, keterangan }: { tombol: ReactNode; keterangan: string }) {
  return (
    <li className="grid gap-2 sm:grid-cols-[15rem_1fr] sm:items-center sm:gap-4">
      {tombol}
      <p className="text-sm text-tinta-redup">{keterangan}</p>
    </li>
  );
}

/** Formulir PDF dan cetak halaman: tiap tombol punya penjelasan singkat agar tidak tertukar. */
export function AksiFormulir({ token }: { token: string }) {
  return (
    <section aria-labelledby="judul-formulir" className="mt-6 rounded-kartu border border-garis bg-permukaan p-4 sm:p-5 print:hidden">
      <h2 id="judul-formulir" className="text-lg font-bold text-ink">
        Formulir pendaftaran
      </h2>
      <p className="mt-1 text-sm text-tinta-redup">
        Formulir berisi semua data yang Anda isi, sama dengan formulir kertas sekolah. Simpan atau cetak sebagai arsip.
      </p>
      <ul className="mt-4 flex flex-col gap-4">
        <Aksi
          tombol={
            <a href={`/api/v1/pendaftar/${token}/formulir?unduh=1`} className={tautanUtama}>
              <DownloadSimpleIcon aria-hidden className="size-5" />
              Unduh formulir (PDF)
            </a>
          }
          keterangan="Menyimpan file PDF formulir ke HP atau komputer Anda."
        />
        <Aksi
          tombol={
            <a href={`/api/v1/pendaftar/${token}/formulir`} target="_blank" rel="noopener" className={tautanSekunder}>
              <EyeIcon aria-hidden className="size-5" />
              Lihat dan cetak formulir
            </a>
          }
          keterangan="Membuka formulir di tab baru untuk dibaca, lalu cetak dari sana bila perlu."
        />
        <Aksi
          tombol={
            <Button varian="hantu" onClick={() => window.print()} penuhMobile>
              <PrinterIcon aria-hidden className="size-5" />
              Cetak halaman ini
            </Button>
          }
          keterangan="Mencetak halaman ini saja (nomor pendaftaran dan ringkasan), bukan formulir."
        />
      </ul>
    </section>
  );
}
