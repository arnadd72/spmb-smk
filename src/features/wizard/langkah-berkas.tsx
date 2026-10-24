"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CameraIcon, FileIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { kompresGambar } from "@/lib/gambar";
import type { Tahap } from "@/lib/ocr/mesin";
import type { HasilParser } from "@/lib/ocr/tipe";
import { PesanGalat } from "./bidang";
import { pecahGalat, simpanLangkahKlien } from "./api";
import { KartuIsianOcr, StatusOcr, type StatusBaca } from "./kartu-ocr";
import { bacaAkta, bacaKk, pesanGagalOcr } from "./ocr";
import { KUNCI_AKTA, KUNCI_KK, gabungSaran, nilaiAkhirOcr } from "./ocr-isian";

export type BerkasKlien = { ref: string; nama: string; mime: string; ukuran: number };
export type SlotBerkas = {
  kunci: string;
  label: string;
  wajib: boolean;
  jamak?: boolean;
  bantuan?: string;
};

const MAKS_MB = 5;
const ukuran = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;

function Unggah({
  slot,
  awal,
  onUbah,
  onBerkas,
  onHapus,
}: {
  slot: SlotBerkas;
  awal: BerkasKlien[];
  onUbah: (jumlah: number) => void;
  /** Dipanggil setelah berkas berhasil diunggah, dengan berkas yang sudah dikompres (dipakai OCR). */
  onBerkas?: (berkas: File, baru: BerkasKlien) => void;
  /** Dipanggil setelah berkas dihapus. */
  onHapus?: (b: BerkasKlien) => void;
}) {
  const [daftar, setDaftar] = useState(awal);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const kamera = useRef<HTMLInputElement>(null);
  const [peringatanSeragam, setPeringatanSeragam] = useState(false);

  function perbarui(baru: BerkasKlien[]) {
    setDaftar(baru);
    onUbah(baru.length);
  }

  async function pilih(asli: File | undefined) {
    if (!asli) return;
    setGalat(undefined);
    setSibuk(true);
    try {
      // Foto kamera HP sering lebih dari 5 MB: perkecil dulu (sisi panjang 1600 px).
      const f = await kompresGambar(asli, 1600);
      if (f.size > MAKS_MB * 1024 * 1024) {
        setGalat(`Ukuran berkas ${ukuran(f.size)} melebihi batas ${MAKS_MB} MB.`);
        return;
      }
      const form = new FormData();
      form.set("kunci", slot.kunci);
      form.set("berkas", f);
      const baru = await apiFetch<BerkasKlien>("/draf/berkas", { method: "POST", body: form });
      perbarui(slot.jamak ? [...daftar, baru] : [baru]);
      onBerkas?.(f, baru);
    } catch (e) {
      setGalat(
        e instanceof ApiError
          ? (e.errors?.berkas?.[0] ?? e.message)
          : "Gagal mengunggah. Coba lagi.",
      );
    } finally {
      setSibuk(false);
      if (input.current) input.current.value = "";
      if (kamera.current) kamera.current.value = "";
    }
  }

  async function hapus(b: BerkasKlien) {
    setGalat(undefined);
    try {
      await apiFetch("/draf/berkas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kunci: slot.kunci, ref: b.ref }),
      });
      perbarui(daftar.filter((x) => x.ref !== b.ref));
      onHapus?.(b);
    } catch {
      setGalat("Gagal menghapus berkas. Coba lagi.");
    }
  }

  const penuh = !slot.jamak && daftar.length > 0;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-tinta">
        {slot.label}
        {slot.wajib ? (
          <span className="ml-1 font-medium text-bahaya">(wajib)</span>
        ) : (
          <span className="ml-1 font-medium text-tinta-redup">(opsional)</span>
        )}
      </p>
      {slot.bantuan && <p className="text-sm text-tinta-redup">{slot.bantuan}</p>}

      {daftar.length > 0 && (
        <ul className="flex flex-col gap-2">
          {daftar.map((b) => (
            <li
              key={b.ref}
              className="flex items-center gap-3 rounded-kontrol border border-garis bg-permukaan p-3"
            >
              <FileIcon aria-hidden weight="duotone" className="size-7 shrink-0 text-primer" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-tinta">{b.nama}</p>
                <p className="angka text-sm text-tinta-redup">{ukuran(b.ukuran)} · terunggah</p>
              </div>
              <Button
                type="button"
                varian="hantu"
                onClick={() => hapus(b)}
                aria-label={`Hapus ${b.nama}`}
              >
                <TrashIcon aria-hidden className="size-5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div
        className={cn(
          "flex flex-col items-center gap-2 rounded-kartu border-2 border-dashed p-4 text-center",
          galat ? "border-bahaya" : "border-garis",
        )}
      >
        <UploadSimpleIcon aria-hidden weight="duotone" className="size-7 text-primer" />
        <p className="text-sm text-tinta-redup" aria-live="polite">
          {sibuk ? "Mengunggah berkas..." : `JPG, PNG, WebP, atau PDF, maksimal ${MAKS_MB} MB.`}
        </p>
        <div className="flex w-full flex-col justify-center gap-2 sm:flex-row">
          <Button
            type="button"
            varian="sekunder"
            disabled={sibuk}
            onClick={() => (slot.kunci === "pas_foto" ? setPeringatanSeragam(true) : kamera.current?.click())}
          >
            <CameraIcon aria-hidden className="size-5" />
            Ambil dari kamera
          </Button>
          <Button type="button" varian="sekunder" disabled={sibuk} onClick={() => input.current?.click()}>
            <UploadSimpleIcon aria-hidden className="size-5" />
            {penuh ? "Ganti dari galeri atau berkas" : slot.jamak && daftar.length > 0 ? "Tambah dari galeri atau berkas" : "Pilih dari galeri atau berkas"}
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          aria-label={`Pilih berkas ${slot.label}`}
          data-berkas={slot.kunci}
          className="sr-only"
          onChange={(e) => pilih(e.target.files?.[0])}
        />
        <input
          ref={kamera}
          type="file"
          accept="image/*"
          capture={slot.kunci === "pas_foto" ? "user" : "environment"}
          aria-label={`Ambil foto ${slot.label} dari kamera`}
          data-kamera={slot.kunci}
          className="sr-only"
          onChange={(e) => pilih(e.target.files?.[0])}
        />
      </div>
      <Dialog
        buka={peringatanSeragam}
        onBukaChange={setPeringatanSeragam}
        judul="Pakai seragam OSIS SMP"
        deskripsi="Pas foto harus diambil dengan memakai seragam OSIS SMP asal. Pastikan wajah terlihat jelas, menghadap depan, dan latar polos."
        aksi={
          <>
            <Button type="button" varian="hantu" onClick={() => setPeringatanSeragam(false)}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => {
                setPeringatanSeragam(false);
                kamera.current?.click();
              }}
            >
              Saya sudah berseragam, buka kamera
            </Button>
          </>
        }
      />
      {galat && <PesanGalat pesan={galat} />}
    </div>
  );
}

export function Navigasi({ langkah, menyimpan }: { langkah: number; menyimpan: boolean }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-garis pt-5 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href={`/daftar/langkah/${langkah - 1}`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-kontrol px-4 text-sm font-semibold text-primer-tua hover:bg-permukaan-alt"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        Kembali
      </Link>
      <Button type="submit" ukuran="lg" memuat={menyimpan} penuhMobile>
        {menyimpan ? "Menyimpan" : "Simpan dan lanjut"}
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------ Langkah 2

type BagianBaca = { fields: HasilParser; peringatan: string[] };

export function LangkahAkta({
  slot,
  berkas,
  namaMurid,
  tanggalLahir,
  awalOcr,
}: {
  slot: SlotBerkas[];
  berkas: Record<string, BerkasKlien[]>;
  /** Nama dan tanggal lahir dari Langkah 1, dipakai mencocokkan NIK di KK dan memeriksa Akta. */
  namaMurid: string;
  tanggalLahir: string;
  /** Saran isian yang sudah tersimpan di draf (kembali ke langkah ini). */
  awalOcr: Record<string, string>;
}) {
  const router = useRouter();
  const [jumlah, setJumlah] = useState<Record<string, number>>(() =>
    Object.fromEntries(slot.map((s) => [s.kunci, berkas[s.kunci]?.length ?? 0])),
  );
  const [galat, setGalat] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);

  const [awal, setAwal] = useState(awalOcr);
  const [status, setStatus] = useState<Record<string, StatusBaca | undefined>>({});
  const [bagian, setBagian] = useState<{ akta?: BagianBaca; kk?: BagianBaca }>({});
  const [suntingan, setSuntingan] = useState<Record<string, string>>({});
  const konteks = { namaMurid, tanggalLahir };

  const saran = gabungSaran(bagian.akta?.fields, bagian.kk?.fields);

  async function jalankan(kunci: "akta" | "kk", f: File) {
    setStatus((s) => ({ ...s, [kunci]: { status: "membaca" } }));
    setBagian((b) => ({ ...b, [kunci]: undefined }));
    const onTahap = (tahap: Tahap) =>
      setStatus((s) => ({ ...s, [kunci]: { status: "membaca", tahap } }));
    const r =
      kunci === "akta" ? await bacaAkta(f, konteks, onTahap) : await bacaKk(f, konteks, onTahap);
    if (!r.ok) {
      setStatus((s) => ({
        ...s,
        [kunci]: { status: "gagal", pesan: pesanGagalOcr(r.kode, f.type === "application/pdf") },
      }));
      return;
    }
    setBagian((b) => ({
      ...b,
      [kunci]: { fields: r.hasil.fields, peringatan: r.hasil.peringatan },
    }));
    // Saran baru menggantikan suntingan lama untuk kunci dokumen ini.
    setSuntingan((x) =>
      Object.fromEntries(
        Object.entries(x).filter(
          ([k]) => !(kunci === "akta" ? KUNCI_AKTA : KUNCI_KK).includes(k as never),
        ),
      ),
    );
    setStatus((s) => ({ ...s, [kunci]: { status: "selesai" } }));
  }

  function dihapus(kunci: "akta" | "kk") {
    setBagian((b) => ({ ...b, [kunci]: undefined }));
    setStatus((s) => ({ ...s, [kunci]: undefined }));
    // Nilai yang berasal dari dokumen itu ikut dibuang.
    const buang: readonly string[] = kunci === "akta" ? KUNCI_AKTA : KUNCI_KK;
    setAwal((a) => Object.fromEntries(Object.entries(a).filter(([k]) => !buang.includes(k))));
    setSuntingan((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !buang.includes(k))));
  }

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    const kurang = slot.find((s) => s.wajib && !jumlah[s.kunci]);
    if (kurang) {
      setGalat(`${kurang.label} wajib diunggah.`);
      return;
    }
    setMenyimpan(true);
    try {
      await simpanLangkahKlien(2, { ocr: nilaiAkhirOcr(saran, suntingan, awal) });
      router.push("/daftar/langkah/3");
    } catch (err) {
      setGalat(pecahGalat(err).umum ?? "Ada berkas yang perlu dilengkapi.");
      setMenyimpan(false);
    }
  }

  const ubah = (k: string, v: string) => setSuntingan((x) => ({ ...x, [k]: v }));
  // Nama orang tua dari KK (cadangan) tampil di kartu KK, bukan di kartu Akta, bila Akta tidak memberinya.
  const dariKk = (["nama_ayah", "nama_ibu"] as const).filter(
    (k) => !bagian.akta?.fields[k]?.nilai && bagian.kk?.fields[k]?.nilai,
  );
  const kunciKk = [...KUNCI_KK, ...dariKk];
  const kunciAkta = KUNCI_AKTA.filter((k) => !(dariKk as readonly string[]).includes(k));

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-6">
      <p className="text-tinta-redup">
        Unggah foto atau pindaian yang jelas dan tidak terpotong. Dokumen dibaca otomatis di HP
        Anda, dan hasilnya bisa Anda perbaiki. Berkas ini hanya dilihat panitia.
      </p>
      {slot.map((s) => {
        const ocr = s.kunci === "akta" || s.kunci === "kk" ? s.kunci : null;
        return (
          <div key={s.kunci} className="flex flex-col gap-3">
            <Unggah
              slot={s}
              awal={berkas[s.kunci] ?? []}
              onUbah={(n) => setJumlah((j) => ({ ...j, [s.kunci]: n }))}
              onBerkas={ocr ? (f) => void jalankan(ocr, f) : undefined}
              onHapus={ocr ? () => dihapus(ocr) : undefined}
            />
            {ocr && <StatusOcr s={status[ocr]} />}
            {ocr === "akta" && (
              <KartuIsianOcr
                judul="Hasil baca Akta kelahiran"
                kunci={kunciAkta}
                saran={saran}
                suntingan={suntingan}
                awal={awal}
                peringatan={bagian.akta?.peringatan ?? []}
                gagal={status.akta?.status === "gagal"}
                onUbah={ubah}
              />
            )}
            {ocr === "kk" && (
              <KartuIsianOcr
                judul="Hasil baca Kartu Keluarga"
                kunci={kunciKk}
                saran={saran}
                suntingan={suntingan}
                awal={awal}
                peringatan={bagian.kk?.peringatan ?? []}
                gagal={status.kk?.status === "gagal"}
                onUbah={ubah}
              />
            )}
          </div>
        );
      })}
      {galat && <PesanGalat pesan={galat} />}
      <Navigasi langkah={2} menyimpan={menyimpan} />
    </form>
  );
}
