"use client";

import { useCallback, useEffect, useState } from "react";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { DefField } from "./konfig";
import { dariBaris, IsiForm, keBody } from "./panel-konten";

type Ringkas = { kode: string; nama: string; kuota: number; isActive: boolean; totalBobot: number; bobot: { mapel: string; bobot: number }[] };

const FIELD: DefField[] = [
  { kunci: "nama", label: "Nama jurusan", tipe: "teks", wajib: true },
  { kunci: "deskripsi", label: "Deskripsi", tipe: "area" },
  { kunci: "prospekKarir", label: "Prospek karier", tipe: "daftarTeks", bantuan: "Satu baris satu butir." },
  { kunci: "keunggulan", label: "Keunggulan", tipe: "daftarTeks", bantuan: "Satu baris satu butir. Teks contoh, final dari sekolah." },
  { kunci: "kuota", label: "Kuota (daya tampung)", tipe: "angka", wajib: true, bantuan: "0 sampai 1000." },
  { kunci: "gambar", label: "Foto jurusan", tipe: "gambar" },
  { kunci: "urutan", label: "Urutan tampil", tipe: "angka", awal: 0 },
  { kunci: "isActive", label: "Tampilkan di situs", tipe: "centang", awal: true },
];

export function PanelJurusan() {
  const [daftar, setDaftar] = useState<Ringkas[] | null>(null);
  const [galatMuat, setGalatMuat] = useState<string>();
  const [edit, setEdit] = useState<string | null>(null);
  const [nilai, setNilai] = useState<Record<string, string | boolean>>({});
  const [galat, setGalat] = useState<Record<string, string[]>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);

  const muat = useCallback(async () => {
    try {
      setDaftar((await apiFetch<{ data: Ringkas[] }>("/admin/jurusan")).data);
    } catch (e) {
      setGalatMuat(e instanceof ApiError ? e.message : "Gagal memuat jurusan.");
    }
  }, []);

  useEffect(() => {
    let batal = false;
    apiFetch<{ data: Ringkas[] }>("/admin/jurusan")
      .then((r) => !batal && setDaftar(r.data))
      .catch((e) => !batal && setGalatMuat(e instanceof ApiError ? e.message : "Gagal memuat jurusan."));
    return () => {
      batal = true;
    };
  }, []);

  async function buka(kode: string) {
    setGalat({});
    setGalatUmum(undefined);
    try {
      const r = await apiFetch<{ data: Record<string, unknown> & { id: string } }>(`/admin/jurusan/${kode}`);
      setNilai(dariBaris(FIELD, r.data));
      setEdit(kode);
    } catch (e) {
      setGalatMuat(e instanceof ApiError ? e.message : "Gagal memuat detail jurusan.");
    }
  }

  async function simpan() {
    if (!edit) return;
    setMenyimpan(true);
    setGalat({});
    setGalatUmum(undefined);
    try {
      await apiFetch(`/admin/jurusan/${edit}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keBody(FIELD, nilai)),
      });
      setEdit(null);
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

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold text-ink">Jurusan dan bobot</h1>
      <p className="mt-2 max-w-prose text-tinta-redup">
        Ubah profil dan kuota jurusan. Editor bobot mata pelajaran (untuk saran jurusan) dikerjakan pada milestone A6.
      </p>

      <div className="mt-6">
        {galatMuat ? (
          <p role="alert" className="rounded-kontrol bg-bahaya-latar px-4 py-3 font-semibold text-bahaya">
            {galatMuat}
          </p>
        ) : daftar === null ? (
          <Skeleton className="h-40 w-full" />
        ) : daftar.length === 0 ? (
          <EmptyState judul="Belum ada jurusan" deskripsi="Jalankan seed (npm run db:seed) untuk mengisi data awal." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {daftar.map((j) => (
              <li key={j.kode} className="rounded-kartu border border-garis bg-permukaan p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-4xl font-bold leading-none text-primer-tua">{j.kode}</p>
                    <p className="mt-2 font-semibold text-ink">{j.nama}</p>
                  </div>
                  {j.isActive ? <Badge nada="sukses">Tampil</Badge> : <Badge nada="netral">Disembunyikan</Badge>}
                </div>
                <p className="angka mt-3 text-sm text-tinta-redup">
                  Kuota {j.kuota} · total bobot {String(j.totalBobot).replace(".", ",")}
                </p>
                <Button varian="sekunder" className="mt-4" onClick={() => buka(j.kode)} aria-label={`Ubah jurusan ${j.kode}`}>
                  <PencilSimpleIcon aria-hidden className="size-5" />
                  Ubah
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        buka={edit !== null}
        onBukaChange={(b) => !b && setEdit(null)}
        judul={`Ubah jurusan ${edit ?? ""}`}
        aksi={
          <>
            <Button varian="hantu" onClick={() => setEdit(null)}>
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
        <IsiForm field={FIELD} nilai={nilai} galat={galat} ubah={(k, v) => setNilai((n) => ({ ...n, [k]: v }))} />
      </Dialog>
    </div>
  );
}
