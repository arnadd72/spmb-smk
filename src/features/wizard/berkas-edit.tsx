"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CameraIcon, FileIcon, ImageIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { kompresGambar } from "@/lib/gambar";
import { PesanGalat } from "./bidang";

/** Ringkasan berkas dari server (tanpa rujukan penyimpanan). */
export type BerkasTersimpan = { kunci: string; nama: string; mime: string; ukuran: number };

/** Berkas pengganti yang sudah dipilih tetapi belum diunggah, menurut kunci berkas. Diunggah saat Simpan perubahan. */
export type AntreanBerkas = Record<string, File>;

export const SLOT = [
  { kunci: "akta", label: "Akta kelahiran", gambarSaja: false, bantuan: "Foto atau pindaian yang jelas dan tidak terpotong." },
  { kunci: "kk", label: "Kartu keluarga", gambarSaja: false, bantuan: "Foto atau pindaian yang jelas dan tidak terpotong." },
  {
    kunci: "pas_foto",
    label: "Pas foto 3 x 4",
    gambarSaja: true,
    bantuan: "Latar merah, seragam sekolah asal, tanpa topi. Dicetak otomatis di formulir pendaftaran.",
  },
] as const;

const MAKS_MB = 5;
const ukuran = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);
const URL_BERKAS = "/api/v1/edit-formulir/berkas";

type PropsSlot = {
  slot: (typeof SLOT)[number];
  awal?: BerkasTersimpan;
  dipilih?: File;
  galat?: string;
  onPilih: (kunci: string, berkas: File | undefined) => void;
};

function Slot({ slot, awal, dipilih, galat: galatSimpan, onPilih }: PropsSlot) {
  const input = useRef<HTMLInputElement>(null);
  const kamera = useRef<HTMLInputElement>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string>();

  // Pratinjau berkas yang baru dipilih; dilepas bila diganti atau slot dibongkar.
  const pratinjau = useMemo(() => (dipilih?.type.startsWith("image/") ? URL.createObjectURL(dipilih) : undefined), [dipilih]);
  useEffect(() => () => (pratinjau ? URL.revokeObjectURL(pratinjau) : undefined), [pratinjau]);

  async function pilih(asli: File | undefined) {
    if (!asli) return;
    setGalat(undefined);
    setSibuk(true);
    try {
      // Foto kamera HP sering lebih dari 5 MB: perkecil dulu (sisi panjang 1600 px), sama seperti di wizard.
      const f = await kompresGambar(asli, 1600);
      if (f.size > MAKS_MB * 1024 * 1024) {
        setGalat(`Ukuran berkas ${ukuran(f.size)} melebihi batas ${MAKS_MB} MB.`);
        return;
      }
      onPilih(slot.kunci, f);
    } finally {
      setSibuk(false);
      if (input.current) input.current.value = "";
      if (kamera.current) kamera.current.value = "";
    }
  }

  const terima = slot.gambarSaja ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf";
  const adaGambarTersimpan = awal?.mime.startsWith("image/");
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-kartu border border-garis bg-latar/60 p-4" data-berkas-edit={slot.kunci}>
      <div className="grid h-40 place-items-center overflow-hidden rounded-kontrol bg-permukaan-alt">
        {dipilih ? (
          pratinjau ? (
            // eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal dari berkas yang baru dipilih
            <img src={pratinjau} alt={`Pratinjau ${slot.label} pengganti`} className="max-h-full max-w-full object-contain" />
          ) : (
            <p className="flex flex-col items-center gap-1.5 text-sm text-tinta-redup">
              <FileIcon aria-hidden className="size-8" />
              Dokumen PDF
            </p>
          )
        ) : adaGambarTersimpan ? (
          // eslint-disable-next-line @next/next/no-img-element -- berkas pribadi lewat sesi edit, bukan aset situs
          <img src={`${URL_BERKAS}?kunci=${slot.kunci}`} alt={`${slot.label} yang tersimpan`} className="max-h-full max-w-full object-contain" />
        ) : awal ? (
          <p className="flex flex-col items-center gap-1.5 text-sm text-tinta-redup">
            <FileIcon aria-hidden className="size-8" />
            Dokumen PDF
          </p>
        ) : (
          <p className="flex flex-col items-center gap-1.5 text-sm text-tinta-redup">
            <ImageIcon aria-hidden className="size-8" />
            Belum diunggah
          </p>
        )}
      </div>
      <div>
        <p className="font-semibold text-ink">{slot.label}</p>
        {dipilih ? (
          <p className="mt-0.5 break-all text-xs text-tinta-redup">
            {dipilih.name} · <span className="angka">{ukuran(dipilih.size)}</span>
          </p>
        ) : awal ? (
          <p className="mt-0.5 break-all text-xs text-tinta-redup">
            {awal.nama} · <span className="angka">{ukuran(awal.ukuran)}</span>
            {awal.mime === "application/pdf" && (
              <>
                {" · "}
                <a href={`${URL_BERKAS}?kunci=${slot.kunci}`} target="_blank" rel="noopener" className="font-semibold text-primer-tua underline underline-offset-2">
                  Buka
                </a>
              </>
            )}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-tinta-redup">{slot.bantuan}</p>
        )}
      </div>
      <div className="mt-auto grid min-w-0 grid-cols-1 gap-2">
        <Button type="button" varian="sekunder" memuat={sibuk} onClick={() => input.current?.click()} aria-label={`${awal || dipilih ? "Ganti" : "Unggah"} ${slot.label}`} className="w-full min-w-0 whitespace-normal px-3 text-center">
          <UploadSimpleIcon aria-hidden className="size-5" />
          {awal || dipilih ? "Ganti berkas" : "Unggah berkas"}
        </Button>
        <Button type="button" varian="hantu" disabled={sibuk} onClick={() => kamera.current?.click()} aria-label={`Ambil ${slot.label} dari kamera`} className="w-full min-w-0 whitespace-normal px-3 text-center">
          <CameraIcon aria-hidden className="size-5" />
          Ambil dari kamera
        </Button>
        {dipilih && (
          <Button type="button" varian="hantu" onClick={() => onPilih(slot.kunci, undefined)} aria-label={`Batalkan penggantian ${slot.label}`} className="w-full min-w-0 whitespace-normal px-3 text-center">
            Batalkan penggantian
          </Button>
        )}
        <input ref={input} type="file" accept={terima} data-unggah={slot.kunci} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pilih(e.target.files?.[0])} />
        <input
          ref={kamera}
          type="file"
          accept="image/*"
          capture={slot.kunci === "pas_foto" ? "user" : "environment"}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => pilih(e.target.files?.[0])}
        />
      </div>
      <div aria-live="polite">
        {dipilih && !galatSimpan && <p className="text-sm font-semibold text-tinta">Belum disimpan. Tekan Simpan perubahan untuk mengganti berkas.</p>}
        {(galat ?? galatSimpan) && <PesanGalat pesan={(galat ?? galatSimpan) as string} />}
      </div>
    </li>
  );
}

/**
 * Pilih pengganti Akta, KK, dan pas foto di halaman Edit Formulir. Berkas yang dipilih hanya ditampung di browser dan
 * baru diunggah ke server saat pendaftar menekan Simpan perubahan (PRD 1.3 butir 73, menggantikan unggah langsung butir 66).
 */
export function BerkasEdit({
  awal,
  antrean,
  galat,
  onPilih,
}: {
  awal: BerkasTersimpan[];
  antrean: AntreanBerkas;
  galat: Record<string, string>;
  onPilih: (kunci: string, berkas: File | undefined) => void;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {SLOT.map((s) => (
        <Slot key={s.kunci} slot={s} awal={awal.find((b) => b.kunci === s.kunci)} dipilih={antrean[s.kunci]} galat={galat[s.kunci]} onPilih={onPilih} />
      ))}
    </ul>
  );
}
