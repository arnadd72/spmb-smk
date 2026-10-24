"use client";

import { useCallback, useEffect, useState } from "react";
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch } from "@/lib/api-client";
import { BATAS_FOTO_HERO } from "@/server/types/aset";
import { KONFIG_KONTEN } from "./konfig";
import { IsiForm, dariBaris, keBody } from "./panel-konten";

type Baris = Record<string, unknown> & {
  id: string;
  gambar: string;
  judul: string | null;
  urutan: number;
  isActive: boolean;
};
type Nilai = Record<string, string | boolean>;

const konfig = KONFIG_KONTEN.hero;
const nama = (b: Baris, i: number) => b.judul || `Foto ke-${i + 2}`;

/**
 * Foto tambahan slideshow beranda, tampil di dalam kartu Foto utama beranda (bukan daftar terpisah).
 * CRUD lewat entitas konten `hero` (`/api/v1/admin/hero`), maksimal BATAS_FOTO_HERO.
 */
export function FotoTambahanHero() {
  const [daftar, setDaftar] = useState<Baris[] | null>(null);
  const [galatMuat, setGalatMuat] = useState<string>();
  const [form, setForm] = useState<{ baris?: Baris } | null>(null);
  const [nilai, setNilai] = useState<Nilai>({});
  const [galat, setGalat] = useState<Record<string, string[]>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapus, setHapus] = useState<{ baris: Baris; nama: string } | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const muat = useCallback(async () => {
    setGalatMuat(undefined);
    try {
      const { data } = await apiFetch<{ data: Baris[] }>(
        `/admin/${konfig.api}?per=${BATAS_FOTO_HERO}`,
      );
      setDaftar(data);
    } catch (e) {
      setGalatMuat(e instanceof ApiError ? e.message : "Gagal memuat foto tambahan.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(muat, 0);
    return () => clearTimeout(t);
  }, [muat]);

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
      if (form?.baris)
        await apiFetch(`/admin/${konfig.api}/${form.baris.id}`, { method: "PUT", ...opsi });
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
      await apiFetch(`/admin/${konfig.api}/${hapus.baris.id}`, { method: "DELETE" });
      setHapus(null);
      await muat();
    } catch (e) {
      setGalatMuat(e instanceof ApiError ? e.message : "Gagal menghapus.");
      setHapus(null);
    } finally {
      setMenghapus(false);
    }
  }

  const penuh = (daftar?.length ?? 0) >= BATAS_FOTO_HERO;

  return (
    <div className="border-t border-garis pt-4" data-foto-tambahan>
      <h3 className="font-semibold text-ink">
        Foto berikutnya{" "}
        <span className="angka font-normal text-tinta-redup">
          ({daftar?.length ?? 0}/{BATAS_FOTO_HERO})
        </span>
      </h3>
      <p className="mt-1 max-w-prose text-sm text-tinta-redup">
        Tampil bergantian setelah foto utama, tiap 5 detik, urut dari angka urutan terkecil.
      </p>

      <div className="mt-3" aria-live="polite">
        {galatMuat ? (
          <p
            role="alert"
            className="rounded-kontrol bg-bahaya-latar px-4 py-3 font-semibold text-bahaya"
          >
            {galatMuat}
          </p>
        ) : daftar === null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="aspect-video w-full" />
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {daftar.map((b, i) => (
              <li key={b.id} className="flex flex-col gap-2" data-foto-hero={b.id}>
                <div className="relative overflow-hidden rounded-kontrol bg-permukaan-alt">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau alamat pilihan admin */}
                  <img
                    src={b.gambar}
                    alt={nama(b, i)}
                    className="aspect-video w-full object-cover"
                    loading="lazy"
                  />
                  <span className="angka absolute left-2 top-2 rounded-full bg-permukaan/90 px-2 py-0.5 text-xs font-semibold text-ink">
                    {i + 2}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-ink">
                  {b.judul || <span className="text-tinta-redup">Tanpa keterangan</span>}
                </p>
                <div className="-mt-1 flex items-center justify-between gap-1">
                  <div>{!b.isActive && <Badge nada="netral">Disembunyikan</Badge>}</div>
                  <div className="flex shrink-0">
                    <Button
                      varian="hantu"
                      onClick={() => bukaForm(b)}
                      aria-label={`Ubah ${nama(b, i)}`}
                    >
                      <PencilSimpleIcon aria-hidden className="size-5" />
                    </Button>
                    <Button
                      varian="hantu"
                      onClick={() => setHapus({ baris: b, nama: nama(b, i) })}
                      aria-label={`Hapus ${nama(b, i)}`}
                    >
                      <TrashIcon aria-hidden className="size-5 text-bahaya" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
            {!penuh && (
              <li>
                <button
                  type="button"
                  onClick={() => bukaForm()}
                  aria-label="Tambah foto tambahan beranda"
                  className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-kontrol border-2 border-dashed border-garis font-semibold text-primer-tua transition-colors hover:border-primer hover:bg-permukaan-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primer"
                >
                  <PlusIcon aria-hidden weight="bold" className="size-6" />
                  Tambah foto
                </button>
              </li>
            )}
          </ul>
        )}
        {penuh && (
          <p className="mt-2 text-sm text-tinta-redup">
            Sudah {BATAS_FOTO_HERO} foto. Hapus salah satu untuk menambah foto lain.
          </p>
        )}
      </div>

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
          <p
            role="alert"
            className="mb-4 rounded-kontrol bg-bahaya-latar px-3 py-2.5 text-sm font-semibold text-bahaya"
          >
            {galatUmum}
          </p>
        )}
        <IsiForm
          field={konfig.field}
          nilai={nilai}
          galat={galat}
          ubah={(k, v) => setNilai((n) => ({ ...n, [k]: v }))}
        />
      </Dialog>

      <Dialog
        buka={hapus !== null}
        onBukaChange={(b) => !b && setHapus(null)}
        judul={`Hapus ${konfig.tunggal}?`}
        deskripsi={
          hapus ? `"${hapus.nama}" akan dihapus permanen dan hilang dari beranda.` : undefined
        }
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
