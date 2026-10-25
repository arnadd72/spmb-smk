"use client";

import { useRef, useState } from "react";
import { CameraIcon, CheckCircleIcon, FileIcon, ImageIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { kompresGambar } from "@/lib/gambar";
import { PesanGalat } from "./bidang";

/** Ringkasan berkas dari server (tanpa rujukan penyimpanan). */
export type BerkasTersimpan = { kunci: string; nama: string; mime: string; ukuran: number };

const SLOT = [
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

function Slot({ slot, awal, onTersimpan }: { slot: (typeof SLOT)[number]; awal?: BerkasTersimpan; onTersimpan: (daftar: BerkasTersimpan[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const kamera = useRef<HTMLInputElement>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string>();
  const [baruSaja, setBaruSaja] = useState(false);
  // Penanda versi agar pratinjau memuat ulang gambar setelah diganti.
  const [versi, setVersi] = useState(0);

  async function pilih(asli: File | undefined) {
    if (!asli) return;
    setGalat(undefined);
    setBaruSaja(false);
    setSibuk(true);
    try {
      // Foto kamera HP sering lebih dari 5 MB: perkecil dulu (sisi panjang 1600 px), sama seperti di wizard.
      const f = await kompresGambar(asli, 1600);
      if (f.size > MAKS_MB * 1024 * 1024) {
        setGalat(`Ukuran berkas ${ukuran(f.size)} melebihi batas ${MAKS_MB} MB.`);
        return;
      }
      const form = new FormData();
      form.set("kunci", slot.kunci);
      form.set("berkas", f);
      const { data } = await apiFetch<{ data: BerkasTersimpan[] }>("/edit-formulir/berkas", { method: "POST", body: form });
      onTersimpan(data);
      setVersi((v) => v + 1);
      setBaruSaja(true);
    } catch (e) {
      setGalat(e instanceof ApiError ? (e.errors?.berkas?.[0] ?? e.message) : "Tidak dapat terhubung ke server.");
    } finally {
      setSibuk(false);
      if (input.current) input.current.value = "";
      if (kamera.current) kamera.current.value = "";
    }
  }

  const terima = slot.gambarSaja ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf";
  return (
    <li className="flex flex-col gap-3 rounded-kartu border border-garis bg-latar/60 p-4" data-berkas-edit={slot.kunci}>
      <div className="grid h-40 place-items-center overflow-hidden rounded-kontrol bg-permukaan-alt">
        {awal?.mime.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element -- berkas pribadi lewat sesi edit, bukan aset situs
          <img src={`${URL_BERKAS}?kunci=${slot.kunci}&v=${versi}`} alt={`${slot.label} yang tersimpan`} className="max-h-full max-w-full object-contain" />
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
        {awal ? (
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
      <div className="mt-auto grid gap-2">
        <Button type="button" varian="sekunder" memuat={sibuk} onClick={() => input.current?.click()} aria-label={`${awal ? "Ganti" : "Unggah"} ${slot.label}`} className="w-full">
          <UploadSimpleIcon aria-hidden className="size-5" />
          {awal ? "Ganti berkas" : "Unggah berkas"}
        </Button>
        <Button type="button" varian="hantu" disabled={sibuk} onClick={() => kamera.current?.click()} aria-label={`Ambil ${slot.label} dari kamera`} className="w-full">
          <CameraIcon aria-hidden className="size-5" />
          Ambil dari kamera
        </Button>
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
        {baruSaja && (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-sukses">
            <CheckCircleIcon aria-hidden weight="fill" className="size-4" />
            Tersimpan.
          </p>
        )}
        {galat && <PesanGalat pesan={galat} />}
      </div>
    </li>
  );
}

/**
 * Ganti Akta, KK, dan pas foto dari halaman Edit Formulir (PRD 1.3 butir 66). Tiap unggahan langsung tersimpan,
 * terpisah dari tombol Simpan perubahan isian.
 */
export function BerkasEdit({ awal }: { awal: BerkasTersimpan[] }) {
  const [daftar, setDaftar] = useState(awal);
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {SLOT.map((s) => (
        <Slot key={s.kunci} slot={s} awal={daftar.find((b) => b.kunci === s.kunci)} onTersimpan={setDaftar} />
      ))}
    </ul>
  );
}
