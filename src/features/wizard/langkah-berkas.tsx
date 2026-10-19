"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, FileIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { kompresGambar } from "@/lib/gambar";
import type { Tahap } from "@/lib/ocr/mesin";
import type { HasilParser, MapelRef } from "@/lib/ocr/tipe";
import { PesanGalat } from "./bidang";
import { pecahGalat, simpanLangkahKlien } from "./api";
import { KartuIsianOcr, StatusOcr, type StatusBaca } from "./kartu-ocr";
import { bacaAkta, bacaKk, pesanGagalOcr } from "./ocr";
import { KUNCI_AKTA, KUNCI_KK, gabungSaran, nilaiAkhirOcr } from "./ocr-isian";
import { rataMapel, skemaNilaiRapor, type NilaiRapor } from "./schema-client";

export type BerkasKlien = { ref: string; nama: string; mime: string; ukuran: number };
export type SlotBerkas = { kunci: string; label: string; wajib: boolean; jamak?: boolean; bantuan?: string };

const MAKS_MB = 5;
const ukuran = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

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
      setGalat(e instanceof ApiError ? (e.errors?.berkas?.[0] ?? e.message) : "Gagal mengunggah. Coba lagi.");
    } finally {
      setSibuk(false);
      if (input.current) input.current.value = "";
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
            <li key={b.ref} className="flex items-center gap-3 rounded-kontrol border border-garis bg-permukaan p-3">
              <FileIcon aria-hidden weight="duotone" className="size-7 shrink-0 text-primer" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-tinta">{b.nama}</p>
                <p className="angka text-sm text-tinta-redup">{ukuran(b.ukuran)} · terunggah</p>
              </div>
              <Button type="button" varian="hantu" onClick={() => hapus(b)} aria-label={`Hapus ${b.nama}`}>
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
        <Button type="button" varian="sekunder" disabled={sibuk} onClick={() => input.current?.click()}>
          {penuh ? "Ganti berkas" : slot.jamak && daftar.length > 0 ? "Tambah berkas" : "Ambil foto atau pilih berkas"}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          capture="environment"
          aria-label={`Pilih berkas ${slot.label}`}
          data-berkas={slot.kunci}
          className="sr-only"
          onChange={(e) => pilih(e.target.files?.[0])}
        />
      </div>
      {galat && <PesanGalat pesan={galat} />}
    </div>
  );
}

function Navigasi({ langkah, menyimpan }: { langkah: number; menyimpan: boolean }) {
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
  const konteks = { namaMurid, tanggalLahir, mapel: [] as MapelRef[] };

  const saran = gabungSaran(bagian.akta?.fields, bagian.kk?.fields);

  async function jalankan(kunci: "akta" | "kk", f: File) {
    setStatus((s) => ({ ...s, [kunci]: { status: "membaca" } }));
    setBagian((b) => ({ ...b, [kunci]: undefined }));
    const onTahap = (tahap: Tahap) => setStatus((s) => ({ ...s, [kunci]: { status: "membaca", tahap } }));
    const r = kunci === "akta" ? await bacaAkta(f, konteks, onTahap) : await bacaKk(f, konteks, onTahap);
    if (!r.ok) {
      setStatus((s) => ({ ...s, [kunci]: { status: "gagal", pesan: pesanGagalOcr(r.kode, f.type === "application/pdf") } }));
      return;
    }
    setBagian((b) => ({ ...b, [kunci]: { fields: r.hasil.fields, peringatan: r.hasil.peringatan } }));
    // Saran baru menggantikan suntingan lama untuk kunci dokumen ini.
    setSuntingan((x) => Object.fromEntries(Object.entries(x).filter(([k]) => !(kunci === "akta" ? KUNCI_AKTA : KUNCI_KK).includes(k as never))));
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
  const dariKk = (["nama_ayah", "nama_ibu"] as const).filter((k) => !bagian.akta?.fields[k]?.nilai && bagian.kk?.fields[k]?.nilai);
  const kunciKk = [...KUNCI_KK, ...dariKk];
  const kunciAkta = KUNCI_AKTA.filter((k) => !(dariKk as readonly string[]).includes(k));

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-6">
      <p className="text-tinta-redup">
        Unggah foto atau pindaian yang jelas dan tidak terpotong. Dokumen dibaca otomatis di HP Anda, dan hasilnya bisa Anda perbaiki.
        Berkas ini hanya dilihat panitia untuk verifikasi.
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

// ------------------------------------------------------------------ Langkah 3

type Grid = Record<string, Record<string, string>>;

const angka = (v: string) => Number(v.trim().replace(",", "."));

export function LangkahRapor({
  mapel,
  semester,
  awal,
}: {
  mapel: { kode: string; nama: string; alias: string[] }[];
  semester: number[];
  awal?: NilaiRapor;
}) {
  const router = useRouter();
  const [grid, setGrid] = useState<Grid>(() =>
    Object.fromEntries(mapel.map((m) => [m.kode, Object.fromEntries(semester.map((s) => [String(s), awal?.mapel[m.kode]?.[String(s)]?.toString() ?? ""]))])),
  );
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);

  function ubah(kode: string, sem: number, v: string) {
    setGrid((g) => ({ ...g, [kode]: { ...g[kode], [sem]: v } }));
    setGalat((x) => ({ ...x, [kode]: "" }));
  }

  const rata = (kode: string) => {
    const sel: Record<string, number> = {};
    for (const [s, v] of Object.entries(grid[kode] ?? {})) {
      const n = angka(v);
      if (v.trim() !== "" && Number.isFinite(n)) sel[s] = n;
    }
    return rataMapel(sel);
  };

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    setGalatUmum(undefined);
    const isi = { semester, mapel: Object.fromEntries(Object.entries(grid).map(([k, s]) => [k, Object.fromEntries(Object.entries(s).map(([a, b]) => [a, b.replace(",", ".")]))])) };
    const cek = skemaNilaiRapor(semester, []).safeParse(isi);
    if (!cek.success) {
      const peta: Record<string, string> = {};
      for (const i of cek.error.issues) peta[String(i.path[1] ?? "_")] ??= i.message;
      setGalat(peta);
      setGalatUmum("Periksa kembali nilai yang ditandai.");
      return;
    }
    setMenyimpan(true);
    try {
      await simpanLangkahKlien(3, { nilai_rapor: isi, sumber_nilai: "manual" });
      router.push("/daftar/langkah/4");
    } catch (err) {
      const { umum, field } = pecahGalat(err);
      const peta: Record<string, string> = {};
      for (const [k, v] of Object.entries(field)) peta[k.split(".")[1] ?? k] = v;
      setGalat(peta);
      setGalatUmum(umum ?? "Periksa kembali nilai yang ditandai.");
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-ink">Nilai rapor</h2>
        <p className="mt-1 text-tinta-redup">
          Nilai rapor opsional. Isi nilai yang tersedia bila ingin mendapat saran jurusan; jika dikosongkan, Anda tetap bisa memilih jurusan sendiri.
          Rata-rata dihitung otomatis.
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {mapel.map((m) => {
          const r = rata(m.kode);
          return (
            <li key={m.kode} className="rounded-kartu border border-garis bg-permukaan p-3 sm:p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-tinta">{m.nama}</p>
                <p className="angka shrink-0 text-sm text-tinta-redup">
                  Rata-rata <span className="font-bold text-tinta">{r === null ? "-" : r.toFixed(1)}</span>
                </p>
              </div>
              <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${semester.length}, minmax(0, 1fr))` }}>
                {semester.map((s) => (
                  <label key={s} className="flex flex-col gap-1 text-center text-xs font-semibold text-tinta-redup">
                    <span>
                      Sem <span className="angka">{s}</span>
                    </span>
                    <Input
                      inputMode="decimal"
                      aria-label={`${m.nama} semester ${s}`}
                      aria-invalid={galat[m.kode] ? true : undefined}
                      value={grid[m.kode]?.[s] ?? ""}
                      onChange={(e) => ubah(m.kode, s, e.target.value)}
                      className="angka px-1 text-center"
                    />
                  </label>
                ))}
              </div>
              {galat[m.kode] && <PesanGalat pesan={galat[m.kode]} />}
            </li>
          );
        })}
      </ul>

      <p className="text-sm text-tinta-redup">Jika mengisi nilai, panitia dapat mencocokkannya dengan rapor asli saat verifikasi atau daftar ulang.</p>

      {galatUmum && <PesanGalat pesan={galatUmum} />}
      <Navigasi langkah={3} menyimpan={menyimpan} />
    </form>
  );
}
