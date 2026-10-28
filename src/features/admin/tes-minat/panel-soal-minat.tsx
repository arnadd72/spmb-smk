"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch } from "@/lib/api-client";
import { HURUF_MINAT, JURUSAN_MINAT, MAKS_SOAL_MINAT, type SoalMinat } from "./schema-client";

type Isian = { teks: string; opsi: string[]; isActive: boolean };
const KOSONG: Isian = { teks: "", opsi: ["", "", "", ""], isActive: true };
const json = { "Content-Type": "application/json" };

/** Kelola soal tes minat bakat: tambah, ubah, urutkan, tampilkan atau sembunyikan, hapus. */
export function PanelSoalMinat() {
  const [daftar, setDaftar] = useState<SoalMinat[] | null>(null);
  const [galatMuat, setGalatMuat] = useState<string>();
  const [form, setForm] = useState<{ soal?: SoalMinat } | null>(null);
  const [isian, setIsian] = useState<Isian>(KOSONG);
  const [galat, setGalat] = useState<Record<string, string[]>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapus, setHapus] = useState<SoalMinat | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const muat = useCallback(async () => {
    setGalatMuat(undefined);
    try {
      const hasil = await apiFetch<{ data: SoalMinat[] }>(`/admin/soal-minat?per=${MAKS_SOAL_MINAT}`);
      setDaftar(hasil.data);
    } catch (e) {
      setGalatMuat(e instanceof ApiError ? e.message : "Gagal memuat soal.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(muat, 0);
    return () => clearTimeout(t);
  }, [muat]);

  function bukaForm(soal?: SoalMinat) {
    setIsian(soal ? { teks: soal.teks, opsi: [...soal.opsi], isActive: soal.isActive } : KOSONG);
    setGalat({});
    setGalatUmum(undefined);
    setForm({ soal });
  }

  async function simpan() {
    setMenyimpan(true);
    setGalat({});
    setGalatUmum(undefined);
    try {
      const body = JSON.stringify(isian);
      if (form?.soal) await apiFetch(`/admin/soal-minat/${form.soal.id}`, { method: "PUT", headers: json, body });
      else await apiFetch("/admin/soal-minat", { method: "POST", headers: json, body });
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

  async function aksiBaris(jalankan: () => Promise<unknown>, pesanGalat: string) {
    try {
      await jalankan();
      await muat();
    } catch (e) {
      setGalatMuat(e instanceof ApiError ? e.message : pesanGalat);
    }
  }

  const geser = (s: SoalMinat, arah: "naik" | "turun") =>
    aksiBaris(() => apiFetch(`/admin/soal-minat/${s.id}/geser`, { method: "POST", headers: json, body: JSON.stringify({ arah }) }), "Gagal menggeser soal.");
  const alihTampil = (s: SoalMinat) =>
    aksiBaris(() => apiFetch(`/admin/soal-minat/${s.id}`, { method: "PUT", headers: json, body: JSON.stringify({ teks: s.teks, opsi: s.opsi, isActive: !s.isActive }) }), "Gagal mengubah status soal.");

  async function konfirmasiHapus() {
    if (!hapus) return;
    setMenghapus(true);
    await aksiBaris(() => apiFetch(`/admin/soal-minat/${hapus.id}`, { method: "DELETE" }), "Gagal menghapus soal.");
    setHapus(null);
    setMenghapus(false);
  }

  const aktif = daftar?.filter((s) => s.isActive).length ?? 0;
  const ubahOpsi = (i: number, v: string) => setIsian((n) => ({ ...n, opsi: n.opsi.map((o, k) => (k === i ? v : o)) }));

  return (
    <div className="mx-auto max-w-5xl" data-panel-konten="soal-minat">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-ink">Tes Minat Bakat</h1>
        <Button onClick={() => bukaForm()} disabled={(daftar?.length ?? 0) >= MAKS_SOAL_MINAT}>
          <PlusIcon aria-hidden weight="bold" className="size-5" />
          Tambah soal
        </Button>
      </div>

      <p className="mt-3 max-w-[70ch] text-tinta-redup">
        Soal ini tampil di halaman Tes Minat Bakat dan di langkah 3 pendaftaran. Pilihan A, B, C, D tiap soal tetap mengarah ke{" "}
        {JURUSAN_MINAT.join(", ")}. Hasil pendaftar yang sudah terkirim tidak berubah.
      </p>
      <p className="mt-3 max-w-[70ch] rounded-kontrol bg-permukaan-alt px-4 py-3 text-sm text-ink">
        Mengubah kata-kata soal aman. Menambah, menghapus, atau menggeser soal saat ada pendaftar yang sedang mengisi bisa menggeser jawaban draf
        mereka, jadi lakukan di luar jam ramai. Tanpa soal yang ditampilkan, tes tidak muncul dan langkah 3 bisa dilewati.
      </p>

      <div className="mt-6" aria-live="polite">
        {galatMuat ? (
          <p role="alert" className="rounded-kontrol bg-bahaya-latar px-4 py-3 font-semibold text-bahaya">
            {galatMuat}
          </p>
        ) : daftar === null ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : daftar.length === 0 ? (
          <EmptyState judul="Belum ada soal" deskripsi="Tambahkan soal pertama agar tes tampil di situs." aksi={<Button onClick={() => bukaForm()}>Tambah soal</Button>} />
        ) : (
          <>
            <p className="angka mb-2 text-sm text-tinta-redup">
              {daftar.length} soal, {aktif} ditampilkan
            </p>
            <ol className="divide-y divide-garis rounded-kartu border border-garis bg-permukaan">
              {daftar.map((s, i) => (
                <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span className="angka mt-0.5 w-7 shrink-0 text-right font-bold text-tinta-redup">{i + 1}.</span>
                    <div className="min-w-0">
                      <p className="font-bold text-ink">{s.teks}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-tinta-redup">
                        {s.isActive ? <Badge nada="sukses">Tampil</Badge> : <Badge nada="netral">Disembunyikan</Badge>}
                        <span>4 pilihan</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button varian="hantu" onClick={() => geser(s, "naik")} disabled={i === 0} aria-label={`Naikkan soal ${i + 1}`}>
                      <ArrowUpIcon aria-hidden className="size-5" />
                    </Button>
                    <Button varian="hantu" onClick={() => geser(s, "turun")} disabled={i === daftar.length - 1} aria-label={`Turunkan soal ${i + 1}`}>
                      <ArrowDownIcon aria-hidden className="size-5" />
                    </Button>
                    <Button varian="sekunder" onClick={() => alihTampil(s)} aria-label={`${s.isActive ? "Sembunyikan" : "Tampilkan"} soal ${i + 1}`}>
                      {s.isActive ? "Sembunyikan" : "Tampilkan"}
                    </Button>
                    <Button varian="sekunder" onClick={() => bukaForm(s)} aria-label={`Ubah soal ${i + 1}`}>
                      <PencilSimpleIcon aria-hidden className="size-5" />
                      Ubah
                    </Button>
                    <Button varian="hantu" onClick={() => setHapus(s)} aria-label={`Hapus soal ${i + 1}`}>
                      <TrashIcon aria-hidden className="size-5 text-bahaya" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      <Dialog
        buka={form !== null}
        onBukaChange={(b) => !b && setForm(null)}
        judul={form?.soal ? "Ubah soal" : "Tambah soal"}
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
        <div className="flex flex-col gap-4">
          <Field label="Teks soal" wajib galat={galat.teks?.[0]}>
            <Textarea rows={3} value={isian.teks} onChange={(e) => setIsian((n) => ({ ...n, teks: e.target.value }))} />
          </Field>
          {HURUF_MINAT.map((huruf, i) => (
            <Field key={huruf} label={`Pilihan ${huruf} (mengarah ke ${JURUSAN_MINAT[i]})`} wajib galat={galat.opsi?.[0] ?? galat[`opsi.${i}`]?.[0]}>
              <Textarea rows={2} value={isian.opsi[i]} onChange={(e) => ubahOpsi(i, e.target.value)} />
            </Field>
          ))}
          <label className="flex min-h-11 items-center gap-3 font-semibold text-tinta">
            <input
              type="checkbox"
              checked={isian.isActive}
              onChange={(e) => setIsian((n) => ({ ...n, isActive: e.target.checked }))}
              className="size-5 accent-[var(--primer)]"
            />
            Tampilkan di situs
          </label>
        </div>
      </Dialog>

      <Dialog
        buka={hapus !== null}
        onBukaChange={(b) => !b && setHapus(null)}
        judul="Hapus soal?"
        deskripsi={hapus ? `"${hapus.teks}" akan dihapus permanen. Untuk menyembunyikan sementara, pakai tombol Sembunyikan.` : undefined}
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
