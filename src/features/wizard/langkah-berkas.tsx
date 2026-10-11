"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, FileIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { PesanGalat } from "./bidang";
import { pecahGalat, simpanLangkahKlien } from "./api";
import { rataMapel, skemaNilaiRapor, type NilaiRapor } from "./schema-client";

export type BerkasKlien = { ref: string; nama: string; mime: string; ukuran: number };
export type SlotBerkas = { kunci: string; label: string; wajib: boolean; jamak?: boolean; bantuan?: string };

const MAKS_MB = 5;
const ukuran = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

function Unggah({
  slot,
  awal,
  onUbah,
}: {
  slot: SlotBerkas;
  awal: BerkasKlien[];
  onUbah: (jumlah: number) => void;
}) {
  const [daftar, setDaftar] = useState(awal);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  function perbarui(baru: BerkasKlien[]) {
    setDaftar(baru);
    onUbah(baru.length);
  }

  async function pilih(f: File | undefined) {
    if (!f) return;
    setGalat(undefined);
    if (f.size > MAKS_MB * 1024 * 1024) {
      setGalat(`Ukuran berkas ${ukuran(f.size)} melebihi batas ${MAKS_MB} MB.`);
      return;
    }
    setSibuk(true);
    try {
      const form = new FormData();
      form.set("kunci", slot.kunci);
      form.set("berkas", f);
      const baru = await apiFetch<BerkasKlien>("/draf/berkas", { method: "POST", body: form });
      perbarui(slot.jamak ? [...daftar, baru] : [baru]);
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

export function LangkahAkta({ slot, berkas }: { slot: SlotBerkas[]; berkas: Record<string, BerkasKlien[]> }) {
  const router = useRouter();
  const [jumlah, setJumlah] = useState<Record<string, number>>(() =>
    Object.fromEntries(slot.map((s) => [s.kunci, berkas[s.kunci]?.length ?? 0])),
  );
  const [galat, setGalat] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    const kurang = slot.find((s) => s.wajib && !jumlah[s.kunci]);
    if (kurang) {
      setGalat(`${kurang.label} wajib diunggah.`);
      return;
    }
    setMenyimpan(true);
    try {
      await simpanLangkahKlien(2, {});
      router.push("/daftar/langkah/3");
    } catch (err) {
      setGalat(pecahGalat(err).umum ?? "Ada berkas yang perlu dilengkapi.");
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-6">
      <p className="text-tinta-redup">
        Unggah foto atau pindaian yang jelas dan tidak terpotong. Berkas ini hanya dilihat panitia untuk verifikasi.
      </p>
      {slot.map((s) => (
        <Unggah key={s.kunci} slot={s} awal={berkas[s.kunci] ?? []} onUbah={(n) => setJumlah((j) => ({ ...j, [s.kunci]: n }))} />
      ))}
      {galat && <PesanGalat pesan={galat} />}
      <Navigasi langkah={2} menyimpan={menyimpan} />
    </form>
  );
}

// ------------------------------------------------------------------ Langkah 3

type Grid = Record<string, Record<string, string>>;

export function LangkahRapor({
  slot,
  berkas,
  mapel,
  semester,
  awal,
}: {
  slot: SlotBerkas;
  berkas: BerkasKlien[];
  mapel: { kode: string; nama: string }[];
  semester: number[];
  awal?: NilaiRapor;
}) {
  const router = useRouter();
  const [jumlahBerkas, setJumlahBerkas] = useState(berkas.length);
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
      const n = Number(v.replace(",", "."));
      if (v.trim() !== "" && Number.isFinite(n)) sel[s] = n;
    }
    return rataMapel(sel);
  };

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    setGalatUmum(undefined);
    if (jumlahBerkas === 0) {
      setGalatUmum("Unggah berkas rapor terlebih dahulu.");
      return;
    }
    const isi = { semester, mapel: Object.fromEntries(Object.entries(grid).map(([k, s]) => [k, Object.fromEntries(Object.entries(s).map(([a, b]) => [a, b.replace(",", ".")]))])) };
    const cek = skemaNilaiRapor(semester, mapel.map((m) => m.kode)).safeParse(isi);
    if (!cek.success) {
      const peta: Record<string, string> = {};
      for (const i of cek.error.issues) peta[String(i.path[1] ?? "_")] ??= i.message;
      setGalat(peta);
      setGalatUmum("Periksa kembali nilai yang ditandai.");
      return;
    }
    setMenyimpan(true);
    try {
      await simpanLangkahKlien(3, { nilai_rapor: isi });
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
      <Unggah slot={slot} awal={berkas} onUbah={setJumlahBerkas} />

      <div>
        <h2 className="text-lg font-bold text-ink">Nilai rapor</h2>
        <p className="mt-1 text-tinta-redup">
          Salin nilai dari rapor untuk setiap semester (0 sampai 100). Isi minimal satu semester untuk tiap mata pelajaran. Rata-rata dihitung otomatis.
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

      <p className="rounded-kontrol bg-info-latar px-3 py-2.5 text-sm font-medium text-info">
        Nilai akan dicocokkan panitia dengan rapor asli saat verifikasi berkas.
      </p>

      {galatUmum && <PesanGalat pesan={galatUmum} />}
      <Navigasi langkah={3} menyimpan={menyimpan} />
    </form>
  );
}
