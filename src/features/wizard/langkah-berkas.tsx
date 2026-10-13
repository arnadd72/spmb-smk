"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, FileIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { kompresGambar } from "@/lib/gambar";
import type { Tahap } from "@/lib/ocr/mesin";
import type { HasilParser, Keyakinan, MapelRef } from "@/lib/ocr/tipe";
import type { HasilRapor } from "@/lib/ocr/parser/rapor";
import { PesanGalat } from "./bidang";
import { pecahGalat, simpanLangkahKlien } from "./api";
import { KartuIsianOcr, StatusOcr, type StatusBaca } from "./kartu-ocr";
import { bacaAkta, bacaKk, bacaRapor, pesanGagalOcr } from "./ocr";
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
      // Foto kamera HP sering lebih dari 5 MB: perkecil dulu (sisi panjang 2000 px untuk rapor, 1600 px lainnya).
      const f = await kompresGambar(asli, slot.kunci === "rapor" ? 2000 : 1600);
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
type Asal = Record<string, { nilai: number; keyakinan: Keyakinan }>;
type BerkasRapor = {
  nama: string;
  status: StatusBaca;
  hasil?: HasilRapor;
  /** Semester yang dipakai untuk berkas ini (terdeteksi atau dipilih pendaftar). */
  semester: number | null;
  /** Kunci sel (`kode|semester`) yang diisi dari berkas ini. */
  diterapkan: string[];
};

const kunciSel = (kode: string, sem: number | string) => `${kode}|${sem}`;
const angka = (v: string) => Number(v.trim().replace(",", "."));

export function LangkahRapor({
  slot,
  berkas,
  mapel,
  semester,
  awal,
}: {
  slot: SlotBerkas;
  berkas: BerkasKlien[];
  mapel: { kode: string; nama: string; alias: string[] }[];
  semester: number[];
  awal?: NilaiRapor;
}) {
  const router = useRouter();
  const [jumlahBerkas, setJumlahBerkas] = useState(berkas.length);
  const [grid, setGrid] = useState<Grid>(() =>
    Object.fromEntries(mapel.map((m) => [m.kode, Object.fromEntries(semester.map((s) => [String(s), awal?.mapel[m.kode]?.[String(s)]?.toString() ?? ""]))])),
  );
  const [asal, setAsal] = useState<Asal>({});
  const [daftarOcr, setDaftarOcr] = useState<Record<string, BerkasRapor>>({});
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);
  const refMapel: MapelRef[] = mapel.map((m) => ({ kode: m.kode, nama: m.nama, alias: m.alias }));

  function ubah(kode: string, sem: number, v: string) {
    setGrid((g) => ({ ...g, [kode]: { ...g[kode], [sem]: v } }));
    setGalat((x) => ({ ...x, [kode]: "" }));
  }

  /** Isi sel dari hasil baca. Sel yang sudah diketik pendaftar tidak ditimpa; sel hasil baca sebelumnya boleh diganti. */
  function terapkan(ref: string, hasil: HasilRapor, sem: number) {
    const baru: string[] = [];
    setGrid((g) => {
      const salin: Grid = { ...g };
      for (const [kode, sel] of Object.entries(hasil.nilai)) {
        const k = kunciSel(kode, sem);
        const sekarang = g[kode]?.[sem] ?? "";
        const belumDisentuh = sekarang.trim() === "" || (asal[k] !== undefined && angka(sekarang) === asal[k].nilai);
        if (!belumDisentuh) continue;
        salin[kode] = { ...g[kode], [sem]: String(sel.nilai) };
        baru.push(k);
      }
      return salin;
    });
    setAsal((a) => ({ ...a, ...Object.fromEntries(Object.entries(hasil.nilai).map(([kode, sel]) => [kunciSel(kode, sem), sel])) }));
    setDaftarOcr((d) => (d[ref] ? { ...d, [ref]: { ...d[ref], semester: sem, diterapkan: baru } } : d));
  }

  /** Kosongkan sel yang diisi dari berkas ini dan belum diubah pendaftar. */
  function lepaskan(entri: BerkasRapor) {
    setGrid((g) => {
      const salin: Grid = { ...g };
      for (const k of entri.diterapkan) {
        const [kode, sem] = k.split("|");
        if (asal[k] && angka(g[kode]?.[sem] ?? "") === asal[k].nilai) salin[kode] = { ...g[kode], [sem]: "" };
      }
      return salin;
    });
    setAsal((a) => Object.fromEntries(Object.entries(a).filter(([k]) => !entri.diterapkan.includes(k))));
  }

  async function jalankan(f: File, baru: BerkasKlien) {
    const ref = baru.ref;
    setDaftarOcr((d) => ({ ...d, [ref]: { nama: baru.nama, status: { status: "membaca" }, semester: null, diterapkan: [] } }));
    const r = await bacaRapor(f, { namaMurid: "", tanggalLahir: "", mapel: refMapel }, (tahap) =>
      setDaftarOcr((d) => (d[ref] ? { ...d, [ref]: { ...d[ref], status: { status: "membaca", tahap } } } : d)),
    );
    if (!r.ok) {
      setDaftarOcr((d) => (d[ref] ? { ...d, [ref]: { ...d[ref], status: { status: "gagal", pesan: pesanGagalOcr(r.kode, f.type === "application/pdf") } } } : d));
      return;
    }
    const sem = r.hasil.semester !== null && semester.includes(r.hasil.semester) ? r.hasil.semester : null;
    setDaftarOcr((d) => (d[ref] ? { ...d, [ref]: { ...d[ref], status: { status: "selesai" }, hasil: r.hasil, semester: sem } } : d));
    if (sem !== null) terapkan(ref, r.hasil, sem);
  }

  function pilihSemester(ref: string, sem: number) {
    const entri = daftarOcr[ref];
    if (!entri?.hasil) return;
    lepaskan(entri);
    terapkan(ref, entri.hasil, sem);
  }

  function dihapus(b: BerkasKlien) {
    const entri = daftarOcr[b.ref];
    if (entri) lepaskan(entri);
    setDaftarOcr((d) => Object.fromEntries(Object.entries(d).filter(([r]) => r !== b.ref)));
  }

  const rata = (kode: string) => {
    const sel: Record<string, number> = {};
    for (const [s, v] of Object.entries(grid[kode] ?? {})) {
      const n = angka(v);
      if (v.trim() !== "" && Number.isFinite(n)) sel[s] = n;
    }
    return rataMapel(sel);
  };

  /** Keadaan sel terhadap hasil baca: "periksa" (belum diubah, keyakinan sedang) atau "diubah". */
  const keadaanSel = (kode: string, sem: number): "periksa" | "diubah" | null => {
    const a = asal[kunciSel(kode, sem)];
    if (!a) return null;
    const v = grid[kode]?.[sem] ?? "";
    if (angka(v) !== a.nilai || v.trim() === "") return "diubah";
    return a.keyakinan === "HIGH" ? null : "periksa";
  };

  /** Asal nilai untuk panitia: manual, hasil baca utuh, atau hasil baca yang dikoreksi. */
  function sumberNilai(): "manual" | "ocr" | "ocr_dikoreksi" {
    const kunci = Object.keys(asal);
    if (kunci.length === 0) return "manual";
    const terisi = Object.entries(grid).flatMap(([kode, sel]) => Object.entries(sel).filter(([, v]) => v.trim() !== "").map(([s]) => kunciSel(kode, s)));
    const utuh = terisi.length === kunci.length && kunci.every((k) => {
      const [kode, sem] = k.split("|");
      return angka(grid[kode]?.[sem] ?? "") === asal[k].nilai;
    });
    return utuh ? "ocr" : "ocr_dikoreksi";
  }

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
      await simpanLangkahKlien(3, { nilai_rapor: isi, sumber_nilai: sumberNilai() });
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

  const entriOcr = Object.entries(daftarOcr);

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-6">
      <Unggah slot={slot} awal={berkas} onUbah={setJumlahBerkas} onBerkas={(f, b) => void jalankan(f, b)} onHapus={dihapus} />

      {entriOcr.map(([ref, e]) => (
        <div key={ref} className="flex flex-col gap-2">
          <StatusOcr s={e.status} />
          {e.status.status === "selesai" && e.hasil && (
            <div className="flex flex-col gap-2 rounded-kartu border border-garis bg-permukaan p-3 text-sm">
              <p className="font-semibold text-tinta">
                {e.nama}: <span className="angka">{Object.keys(e.hasil.nilai).length}</span> mata pelajaran terbaca
              </p>
              <label className="flex flex-wrap items-center gap-2 text-tinta">
                <span>{e.semester === null ? "Semester berapa halaman rapor ini?" : "Semester halaman ini"}</span>
                <select
                  aria-label={`Semester untuk ${e.nama}`}
                  value={e.semester ?? ""}
                  onChange={(ev) => ev.target.value && pilihSemester(ref, Number(ev.target.value))}
                  className="min-h-11 rounded-kontrol border border-garis bg-permukaan px-3 text-base"
                >
                  <option value="">Pilih semester</option>
                  {semester.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </label>
              {e.hasil.tidakDikenali.length > 0 && (
                <p className="text-tinta-redup">
                  Tidak dikenali (isi manual bila perlu): {e.hasil.tidakDikenali.map((t) => `${t.nama} (${t.nilai})`).join(", ")}.
                </p>
              )}
            </div>
          )}
        </div>
      ))}

      <div>
        <h2 className="text-lg font-bold text-ink">Nilai rapor</h2>
        <p className="mt-1 text-tinta-redup">
          Salin nilai dari rapor untuk setiap semester (0 sampai 100). Isi minimal satu semester untuk tiap mata pelajaran. Rata-rata dihitung otomatis.
          Nilai yang terbaca otomatis tetap perlu Anda periksa.
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {mapel.map((m) => {
          const r = rata(m.kode);
          const keadaan = semester.map((s) => keadaanSel(m.kode, s));
          return (
            <li key={m.kode} className="rounded-kartu border border-garis bg-permukaan p-3 sm:p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-tinta">{m.nama}</p>
                <p className="angka shrink-0 text-sm text-tinta-redup">
                  Rata-rata <span className="font-bold text-tinta">{r === null ? "-" : r.toFixed(1)}</span>
                </p>
              </div>
              {(keadaan.includes("periksa") || keadaan.includes("diubah")) && (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {keadaan.includes("periksa") && <Badge nada="peringatan">Perlu dicek</Badge>}
                  {keadaan.includes("diubah") && <Badge nada="info">Diubah</Badge>}
                </div>
              )}
              <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${semester.length}, minmax(0, 1fr))` }}>
                {semester.map((s, i) => (
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
                      className={cn("angka px-1 text-center", keadaan[i] === "periksa" && "bg-peringatan-latar")}
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
