"use client";

import { useRef, useState, type SyntheticEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatTanggal } from "@/lib/format";
import { Bidang } from "./bidang";
import { pecahGalat, simpanLangkahKlien, type PetaGalat } from "./api";
import { fieldBiasa, skemaLangkah, type DefinisiField } from "./schema-client";

export type Salinan = {
  label: string;
  /** kunci tujuan -> kunci sumber. */
  peta: Record<string, string>;
  /** Sumber nilai dari luar form (mis. data murid). Kosong = ambil dari isian form ini. */
  sumber?: Record<string, unknown>;
};

type Props = {
  langkah: number;
  fields: DefinisiField[];
  awal: Record<string, unknown>;
  salinan?: Salinan;
  /** Kunci -> nilai yang terisi dari OCR; ditandai "Dari dokumen" selama belum diubah. */
  dariDokumen?: Record<string, string>;
  /** Konten tambahan di atas form (mis. persyaratan dan teks persetujuan). */
  pembuka?: ReactNode;
  /** Tanggal lahir dari langkah 1, ditampilkan baca-saja agar tidak perlu diisi ulang. */
  tanggalLahirTampilan?: string;
  labelLanjut?: string;
};

/** Form generik untuk langkah 1, 5, 6, dan 7: field dari form builder + validasi sama dengan server. */
export function LangkahForm({ langkah, fields, awal, salinan, dariDokumen, pembuka, tanggalLahirTampilan, labelLanjut = "Simpan dan lanjut" }: Props) {
  const router = useRouter();
  const daftar = fieldBiasa(fields, langkah);

  const [nilai, setNilai] = useState<Record<string, unknown>>(() => {
    const dasar: Record<string, unknown> = {};
    for (const f of daftar) dasar[f.kunci] = awal[f.kunci] ?? (f.tipe === "checkbox" ? false : "");
    return dasar;
  });
  const [sama, setSama] = useState(false);
  const [galat, setGalat] = useState<PetaGalat>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);
  // Peringatan pendaftar ganda (poin E): data sudah tersimpan; pendaftar memilih membuka Cek Pendaftaran atau tekan Lanjut lagi.
  const [peringatan, setPeringatan] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);

  const terkunci = new Set(sama && salinan ? Object.keys(salinan.peta) : []);

  function ubah(kunci: string, v: unknown) {
    setNilai((n) => ({ ...n, [kunci]: v }));
    setGalat((g) => (g[kunci] ? { ...g, [kunci]: "" } : g));
  }

  function nilaiAkhir(): Record<string, unknown> {
    const hasil: Record<string, unknown> = { ...nilai };
    if (sama && salinan) {
      for (const [tujuan, sumber] of Object.entries(salinan.peta)) hasil[tujuan] = (salinan.sumber ?? nilai)[sumber] ?? "";
    }
    return hasil;
  }

  const tandaDokumen = (kunci: string) => dariDokumen?.[kunci] !== undefined && nilai[kunci] === dariDokumen[kunci];

  function fokusGalatPertama() {
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
  }

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    setGalatUmum(undefined);
    const isi = nilaiAkhir();

    // Pemeriksaan awal di klien memakai skema yang sama dengan server; server tetap otoritatif.
    const peta: PetaGalat = {};
    const biasa = skemaLangkah(fields, langkah).safeParse(isi);
    if (!biasa.success) for (const i of biasa.error.issues) peta[i.path.join(".")] ??= i.message;
    if (Object.keys(peta).length > 0) {
      setGalat(peta);
      fokusGalatPertama();
      return;
    }

    setMenyimpan(true);
    try {
      const hasil = await simpanLangkahKlien(langkah, isi);
      if (hasil.peringatan && !peringatan) {
        setPeringatan(hasil.peringatan);
        setMenyimpan(false);
        return;
      }
      router.push(`/daftar/langkah/${langkah + 1}`);
    } catch (err) {
      const { umum, field } = pecahGalat(err);
      setGalat(field);
      setGalatUmum(umum ?? "Ada isian yang perlu diperbaiki.");
      setMenyimpan(false);
      fokusGalatPertama();
    }
  }

  return (
    <form ref={formRef} onSubmit={kirim} noValidate className="flex flex-col gap-6">
      {pembuka}

      {galatUmum && (
        <p role="alert" className="rounded-kontrol bg-bahaya-latar px-3 py-2.5 text-sm font-semibold text-bahaya">
          {galatUmum}
        </p>
      )}

      {peringatan && (
        <div role="alert" className="flex flex-col gap-2 rounded-kontrol border border-peringatan/30 bg-peringatan-latar px-3 py-2.5 text-sm text-peringatan">
          <p className="font-semibold">{peringatan}</p>
          <Link href="/cek-pendaftaran" className="inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-4">
            Buka Cek Pendaftaran
          </Link>
        </div>
      )}

      <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
        {tanggalLahirTampilan && (
          <Field label="Tanggal lahir" bantuan="Diisi pada langkah pertama; tidak perlu diisi ulang.">
            <Input value={formatTanggal(tanggalLahirTampilan)} readOnly aria-readonly="true" />
          </Field>
        )}
        {daftar.map((f) =>
          salinan && f.kunci === Object.keys(salinan.peta)[0] ? (
            <div key={`salin-${f.kunci}`} className="contents">
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-base text-tinta sm:col-span-2">
                <input type="checkbox" checked={sama} onChange={(e) => setSama(e.target.checked)} className="mt-1 size-5 shrink-0 accent-primer" />
                <span>{salinan.label}</span>
              </label>
              <Bidang f={f} nilai={nilai[f.kunci]} onChange={ubah} galat={galat[f.kunci] || undefined} disabled={terkunci.has(f.kunci)} dariDokumen={tandaDokumen(f.kunci)} />
            </div>
          ) : (
            <Bidang key={f.kunci} f={f} nilai={nilai[f.kunci]} onChange={ubah} galat={galat[f.kunci] || undefined} disabled={terkunci.has(f.kunci)} dariDokumen={tandaDokumen(f.kunci)} />
          ),
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-garis pt-5 sm:flex-row sm:items-center sm:justify-between">
        {langkah > 1 ? (
          <Link
            href={`/daftar/langkah/${langkah - 1}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-kontrol px-4 text-sm font-semibold text-primer-tua hover:bg-permukaan-alt"
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
            Kembali
          </Link>
        ) : (
          <span />
        )}
        <Button type="submit" ukuran="lg" memuat={menyimpan} penuhMobile>
          {menyimpan ? "Menyimpan" : labelLanjut}
        </Button>
      </div>
    </form>
  );
}
