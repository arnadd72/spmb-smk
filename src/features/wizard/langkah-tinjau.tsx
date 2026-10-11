"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { PesanGalat } from "./bidang";
import { jsonPost, pecahGalat } from "./api";

export type BagianTinjau = {
  judul: string;
  langkah: number;
  baris: { label: string; nilai: string }[];
};

export function LangkahTinjau({ bagian }: { bagian: BagianTinjau[] }) {
  const router = useRouter();
  const [setuju, setSetuju] = useState(false);
  const [galat, setGalat] = useState<string>();
  const [mengirim, setMengirim] = useState(false);

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    if (mengirim) return;
    if (!setuju) {
      setGalat("Centang pernyataan bahwa data yang Anda isi benar.");
      return;
    }
    setGalat(undefined);
    setMengirim(true);
    try {
      const hasil = await apiFetch<{ nomor: string; aksesToken: string }>("/draf/kirim", jsonPost({ konfirmasi_final: true }));
      router.push(`/daftar/sukses/${hasil.aksesToken}`);
    } catch (err) {
      setGalat(pecahGalat(err).umum ?? "Pendaftaran belum dapat dikirim. Periksa kembali isian Anda.");
      setMengirim(false);
    }
  }

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-6">
      <p className="text-tinta-redup">Periksa kembali semua data sebelum dikirim. Pilih Ubah untuk memperbaiki bagian tertentu.</p>

      {bagian.map((b) => (
        <section key={b.langkah} aria-labelledby={`tinjau-${b.langkah}`} className="rounded-kartu border border-garis bg-permukaan p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id={`tinjau-${b.langkah}`} className="text-lg font-bold text-ink">
              {b.judul}
            </h2>
            <Link
              href={`/daftar/langkah/${b.langkah}`}
              className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-primer-tua underline underline-offset-4"
            >
              Ubah<span className="sr-only"> {b.judul}</span>
            </Link>
          </div>
          <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {b.baris.map((r) => (
              <div key={r.label} className="min-w-0">
                <dt className="text-sm text-tinta-redup">{r.label}</dt>
                <dd className="break-words font-medium text-tinta">{r.nilai || "-"}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-base text-tinta">
        <input type="checkbox" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} className="mt-1 size-5 shrink-0 accent-primer" />
        <span>Saya menyatakan data yang saya isi benar dan dapat dipertanggungjawabkan.</span>
      </label>
      {galat && <PesanGalat pesan={galat} />}

      <div className="flex flex-col-reverse gap-3 border-t border-garis pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/daftar/langkah/7"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-kontrol px-4 text-sm font-semibold text-primer-tua hover:bg-permukaan-alt"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          Kembali
        </Link>
        <Button type="submit" ukuran="lg" varian="aksen" memuat={mengirim} penuhMobile disabled={mengirim}>
          {mengirim ? "Mengirim pendaftaran" : "Kirim pendaftaran"}
        </Button>
      </div>
    </form>
  );
}
