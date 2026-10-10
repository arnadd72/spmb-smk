"use client";

import { useCallback, useEffect, useState } from "react";
import { MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatTanggal } from "@/lib/format";
import type { DefField, DefKolom, KonfigKonten } from "./konfig";

type Baris = Record<string, unknown> & { id: string };
type Daftar = { data: Baris[]; total: number; halaman: number; per: number };
type Nilai = Record<string, string | boolean>;

const PER = 20;

// ---------------------------------------------------------------- konversi form

function zonaLokal(iso: string): string {
  const d = new Date(iso);
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}T${dua(d.getHours())}:${dua(d.getMinutes())}`;
}

export function dariBaris(field: DefField[], baris?: Baris): Nilai {
  const n: Nilai = {};
  for (const f of field) {
    const v = baris?.[f.kunci];
    if (f.tipe === "centang") n[f.kunci] = typeof v === "boolean" ? v : Boolean(f.awal);
    else if (v === undefined || v === null) n[f.kunci] = f.awal === undefined ? "" : String(f.awal);
    else if (f.tipe === "tanggalwaktu") n[f.kunci] = zonaLokal(String(v));
    else if (Array.isArray(v)) n[f.kunci] = v.join(f.tipe === "daftarTeks" ? "\n" : ", ");
    else n[f.kunci] = String(v);
  }
  return n;
}

export function keBody(field: DefField[], n: Nilai): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of field) {
    const v = n[f.kunci];
    if (f.tipe === "centang") body[f.kunci] = Boolean(v);
    else if (f.tipe === "angka") body[f.kunci] = v === "" ? undefined : Number(v);
    else if (f.tipe === "tanggalwaktu") body[f.kunci] = v ? new Date(String(v)).toISOString() : null;
    else body[f.kunci] = String(v ?? "");
  }
  return body;
}

// ---------------------------------------------------------------- tampilan sel

function Sel({ kolom, baris }: { kolom: DefKolom; baris: Baris }) {
  const v = baris[kolom.kunci];
  switch (kolom.tipe) {
    case "status":
      return v ? <Badge nada="sukses">Tampil</Badge> : <Badge nada="netral">Disembunyikan</Badge>;
    case "tanggal":
      return <span className="angka">{v ? formatTanggal(String(v)) : "Belum terbit"}</span>;
    case "angka":
      return <span className="angka">{String(v ?? "")}</span>;
    case "gambar":
      // eslint-disable-next-line @next/next/no-img-element
      return v ? <img src={String(v)} alt="" className="size-14 rounded-kontrol object-cover" loading="lazy" /> : <span className="text-tinta-redup">-</span>;
    case "potong":
      return <span className="line-clamp-2">{String(v ?? "")}</span>;
    default:
      return <span>{v ? String(v) : "-"}</span>;
  }
}

// ---------------------------------------------------------------- form

export function IsiForm({
  field,
  nilai,
  galat,
  ubah,
}: {
  field: DefField[];
  nilai: Nilai;
  galat: Record<string, string[]>;
  ubah: (kunci: string, v: string | boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {field.map((f) => {
        const pesan = galat[f.kunci]?.[0];
        if (f.tipe === "centang") {
          return (
            <label key={f.kunci} className="flex min-h-11 items-center gap-3 font-semibold text-tinta">
              <input
                type="checkbox"
                checked={Boolean(nilai[f.kunci])}
                onChange={(e) => ubah(f.kunci, e.target.checked)}
                className="size-5 accent-[var(--primer)]"
              />
              {f.label}
            </label>
          );
        }
        return (
          <Field key={f.kunci} label={f.label} wajib={f.wajib} bantuan={f.bantuan} galat={pesan}>
            {f.tipe === "area" || f.tipe === "html" || f.tipe === "daftarTeks" ? (
              <Textarea
                rows={f.tipe === "html" ? 10 : f.tipe === "daftarTeks" ? 5 : 4}
                value={String(nilai[f.kunci] ?? "")}
                onChange={(e) => ubah(f.kunci, e.target.value)}
                className={f.tipe === "html" ? "font-mono text-sm" : undefined}
              />
            ) : (
              <Input
                type={f.tipe === "angka" ? "number" : f.tipe === "tanggalwaktu" ? "datetime-local" : "text"}
                inputMode={f.tipe === "angka" ? "numeric" : undefined}
                value={String(nilai[f.kunci] ?? "")}
                onChange={(e) => ubah(f.kunci, e.target.value)}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- panel

export function PanelKonten({ konfig }: { konfig: KonfigKonten }) {
  const [daftar, setDaftar] = useState<Daftar | null>(null);
  const [galatMuat, setGalatMuat] = useState<string>();
  const [q, setQ] = useState("");
  const [halaman, setHalaman] = useState(1);
  const [form, setForm] = useState<{ baris?: Baris } | null>(null);
  const [nilai, setNilai] = useState<Nilai>({});
  const [galat, setGalat] = useState<Record<string, string[]>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapus, setHapus] = useState<Baris | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const muat = useCallback(async () => {
    setGalatMuat(undefined);
    try {
      const p = new URLSearchParams({ halaman: String(halaman), per: String(PER) });
      if (q.trim()) p.set("q", q.trim());
      setDaftar(await apiFetch<Daftar>(`/admin/${konfig.api}?${p}`));
    } catch (e) {
      setGalatMuat(e instanceof ApiError ? e.message : "Gagal memuat data.");
    }
  }, [konfig.api, halaman, q]);

  useEffect(() => {
    const t = setTimeout(muat, q ? 300 : 0); // jeda singkat saat mengetik pencarian
    return () => clearTimeout(t);
  }, [muat, q]);

  function bukaForm(baris?: Baris) {
    setNilai(dariBaris(konfig.field, baris));
    setGalat({});
    setGalatUmum(undefined);
    setForm({ baris });
  }

  async function simpan() {
    setMenyimpan(true);
    setGalat({});
    setGalatUmum(undefined);
    try {
      const body = JSON.stringify(keBody(konfig.field, nilai));
      const opsi = { headers: { "Content-Type": "application/json" }, body };
      if (form?.baris) await apiFetch(`/admin/${konfig.api}/${form.baris.id}`, { method: "PUT", ...opsi });
      else await apiFetch(`/admin/${konfig.api}`, { method: "POST", ...opsi });
      setForm(null);
      await muat();
    } catch (e) {
      if (e instanceof ApiError) {
        setGalat(e.errors ?? {});
        setGalatUmum(e.errors ? "Periksa isian yang bertanda galat." : e.message);
      } else setGalatUmum("Tidak dapat terhubung ke server.");
    } finally {
      setMenyimpan(false);
    }
  }

  async function konfirmasiHapus() {
    if (!hapus) return;
    setMenghapus(true);
    try {
      await apiFetch(`/admin/${konfig.api}/${hapus.id}`, { method: "DELETE" });
      setHapus(null);
      await muat();
    } catch (e) {
      setGalatMuat(e instanceof ApiError ? e.message : "Gagal menghapus.");
      setHapus(null);
    } finally {
      setMenghapus(false);
    }
  }

  const totalHalaman = daftar ? Math.max(1, Math.ceil(daftar.total / daftar.per)) : 1;
  const judulBaris = (b: Baris) => String(b.judul ?? b.nama ?? b.pertanyaan ?? "");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-ink">{konfig.judul}</h1>
        <Button onClick={() => bukaForm()}>
          <PlusIcon aria-hidden weight="bold" className="size-5" />
          Tambah {konfig.tunggal}
        </Button>
      </div>

      <div className="relative mt-6 max-w-sm">
        <MagnifyingGlassIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-tinta-redup" />
        <Input
          aria-label={`Cari ${konfig.judul.toLowerCase()}`}
          placeholder="Cari"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setHalaman(1);
          }}
          className="pl-10"
        />
      </div>

      <div className="mt-6" aria-live="polite">
        {galatMuat ? (
          <p role="alert" className="rounded-kontrol bg-bahaya-latar px-4 py-3 font-semibold text-bahaya">
            {galatMuat}
          </p>
        ) : daftar === null ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : daftar.data.length === 0 ? (
          <EmptyState
            judul={q ? "Tidak ada hasil" : konfig.kosong.judul}
            deskripsi={q ? "Coba kata kunci lain." : konfig.kosong.deskripsi}
            aksi={!q && <Button onClick={() => bukaForm()}>Tambah {konfig.tunggal}</Button>}
          />
        ) : (
          <ul className="divide-y divide-garis rounded-kartu border border-garis bg-permukaan">
            {daftar.data.map((b) => (
              <li key={b.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid min-w-0 flex-1 gap-x-6 gap-y-1 sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] sm:items-center">
                  {konfig.kolom.map((k, i) => (
                    <div key={k.kunci} className={i === 0 ? "min-w-0 font-bold text-ink sm:col-span-2" : "text-sm text-tinta-redup"}>
                      <Sel kolom={k} baris={b} />
                    </div>
                  ))}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button varian="sekunder" onClick={() => bukaForm(b)} aria-label={`Ubah ${judulBaris(b)}`}>
                    <PencilSimpleIcon aria-hidden className="size-5" />
                    Ubah
                  </Button>
                  <Button varian="hantu" onClick={() => setHapus(b)} aria-label={`Hapus ${judulBaris(b)}`}>
                    <TrashIcon aria-hidden className="size-5 text-bahaya" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {daftar && totalHalaman > 1 && (
        <nav aria-label="Halaman" className="mt-5 flex items-center justify-between gap-3">
          <Button varian="sekunder" disabled={halaman <= 1} onClick={() => setHalaman((h) => h - 1)}>
            Sebelumnya
          </Button>
          <p className="angka text-sm text-tinta-redup">
            Halaman {halaman} dari {totalHalaman}
          </p>
          <Button varian="sekunder" disabled={halaman >= totalHalaman} onClick={() => setHalaman((h) => h + 1)}>
            Berikutnya
          </Button>
        </nav>
      )}

      <Dialog
        buka={form !== null}
        onBukaChange={(b) => !b && setForm(null)}
        judul={form?.baris ? `Ubah ${konfig.tunggal}` : `Tambah ${konfig.tunggal}`}
        aksi={
          <>
            <Button varian="hantu" onClick={() => setForm(null)}>
              Batal
            </Button>
            <Button memuat={menyimpan} onClick={simpan}>
              Simpan
            </Button>
          </>
        }
      >
        {galatUmum && (
          <p role="alert" className="mb-4 rounded-kontrol bg-bahaya-latar px-3 py-2.5 text-sm font-semibold text-bahaya">
            {galatUmum}
          </p>
        )}
        <IsiForm field={konfig.field} nilai={nilai} galat={galat} ubah={(k, v) => setNilai((n) => ({ ...n, [k]: v }))} />
      </Dialog>

      <Dialog
        buka={hapus !== null}
        onBukaChange={(b) => !b && setHapus(null)}
        judul={`Hapus ${konfig.tunggal}?`}
        deskripsi={hapus ? `"${judulBaris(hapus)}" akan dihapus permanen dan hilang dari situs.` : undefined}
        aksi={
          <>
            <Button varian="hantu" onClick={() => setHapus(null)}>
              Batal
            </Button>
            <Button varian="bahaya" memuat={menghapus} onClick={konfirmasiHapus}>
              Hapus
            </Button>
          </>
        }
      />
    </div>
  );
}
