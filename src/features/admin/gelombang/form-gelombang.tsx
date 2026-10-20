"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatTanggal } from "@/lib/format";

export type BarisGelombang = {
  id: string;
  nama: string;
  buka: string;
  tutup: string;
  kuota: number | null;
  terisi: number;
  sisa: number | null;
  isActive: boolean;
  status: "belum" | "buka" | "tutup" | "penuh";
};

type Isian = { nama: string; buka: string; tutup: string; kuota: string; isActive: boolean };
type Galat = Partial<Record<keyof Isian | "umum", string>>;

const NADA = { belum: "info", buka: "sukses", tutup: "netral", penuh: "peringatan" } as const;
const LABEL = { belum: "Belum dibuka", buka: "Sedang dibuka", tutup: "Sudah ditutup", penuh: "Kuota penuh" } as const;

const dariBaris = (b: BarisGelombang): Isian => ({ nama: b.nama, buka: b.buka, tutup: b.tutup, kuota: b.kuota === null ? "" : String(b.kuota), isActive: b.isActive });

function pesanGalat(err: unknown): Galat {
  if (err instanceof ApiError) {
    if (err.errors) return Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])) as Galat;
    return { umum: err.message };
  }
  return { umum: "Tidak dapat terhubung ke server." };
}

function periksa(i: Isian): Galat {
  const g: Galat = {};
  if (!i.nama.trim()) g.nama = "Nama gelombang wajib diisi.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.buka)) g.buka = "Tanggal buka wajib diisi.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.tutup)) g.tutup = "Tanggal tutup wajib diisi.";
  else if (i.buka && i.tutup < i.buka) g.tutup = "Tanggal tutup tidak boleh sebelum tanggal buka.";
  if (i.kuota.trim() !== "" && (!Number.isInteger(Number(i.kuota)) || Number(i.kuota) < 1)) g.kuota = "Kuota berupa bilangan bulat minimal 1, atau kosongkan.";
  return g;
}

function muatan(i: Isian) {
  return { nama: i.nama.trim(), buka: i.buka, tutup: i.tutup, kuota: i.kuota.trim() === "" ? null : Number(i.kuota), isActive: i.isActive };
}

function BarisForm({ awal, baris, onSelesai }: { awal: Isian; baris?: BarisGelombang; onSelesai: () => void }) {
  const router = useRouter();
  const [isi, setIsi] = useState<Isian>(awal);
  const [galat, setGalat] = useState<Galat>({});
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string>();
  const ubah = <K extends keyof Isian>(k: K, v: Isian[K]) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => ({ ...g, [k]: undefined }));
    setPesan(undefined);
  };

  async function simpan(e: SyntheticEvent) {
    e.preventDefault();
    const g = periksa(isi);
    setGalat(g);
    if (Object.keys(g).length > 0) return;
    setSibuk(true);
    try {
      if (baris) await apiFetch(`/admin/gelombang/${baris.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(muatan(isi)) });
      else await apiFetch("/admin/gelombang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(muatan(isi)) });
      setPesan("Tersimpan.");
      router.refresh();
      onSelesai();
    } catch (err) {
      setGalat(pesanGalat(err));
    } finally {
      setSibuk(false);
    }
  }

  async function hapus() {
    if (!baris) return;
    if (!window.confirm(`Hapus ${baris.nama}? Tindakan ini tidak bisa dibatalkan.`)) return;
    setSibuk(true);
    try {
      await apiFetch(`/admin/gelombang/${baris.id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setGalat(pesanGalat(err));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <form onSubmit={simpan} noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Nama gelombang" wajib galat={galat.nama} className="sm:col-span-2 lg:col-span-1">
        <Input value={isi.nama} onChange={(e) => ubah("nama", e.target.value)} placeholder="Gelombang 1" />
      </Field>
      <Field label="Tanggal buka" wajib galat={galat.buka}>
        <Input type="date" value={isi.buka} onChange={(e) => ubah("buka", e.target.value)} />
      </Field>
      <Field label="Tanggal tutup" wajib galat={galat.tutup}>
        <Input type="date" value={isi.tutup} onChange={(e) => ubah("tutup", e.target.value)} />
      </Field>
      <Field label="Kuota" bantuan="Kosongkan bila tanpa batas." galat={galat.kuota}>
        <Input inputMode="numeric" value={isi.kuota} onChange={(e) => ubah("kuota", e.target.value)} placeholder="100" className="max-w-40" />
      </Field>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-tinta sm:col-span-2 lg:col-span-4">
        <input type="checkbox" checked={isi.isActive} onChange={(e) => ubah("isActive", e.target.checked)} className="size-5 accent-primer" />
        Gelombang aktif (tampil di situs dan dipakai untuk membuka pendaftaran)
      </label>
      {galat.umum && (
        <p role="alert" className="rounded-kontrol bg-bahaya-latar px-3 py-2.5 text-sm font-semibold text-bahaya sm:col-span-2 lg:col-span-4">
          {galat.umum}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
        <Button type="submit" memuat={sibuk}>
          {baris ? "Simpan perubahan" : "Tambah gelombang"}
        </Button>
        {baris && (
          <Button type="button" varian="bahaya" onClick={hapus} disabled={sibuk}>
            Hapus
          </Button>
        )}
        {pesan && (
          <span role="status" className="text-sm font-medium text-sukses">
            {pesan}
          </span>
        )}
      </div>
    </form>
  );
}

/** Daftar gelombang pendaftaran dengan sunting per gelombang dan formulir tambah. */
export function FormGelombang({ awal }: { awal: BarisGelombang[] }) {
  const [buka, setBuka] = useState<string | null>(awal.length === 0 ? "baru" : null);

  return (
    <div className="flex flex-col gap-4">
      {awal.map((b) => (
        <section key={b.id} aria-labelledby={`g-${b.id}`} className="rounded-kartu border border-garis bg-permukaan p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id={`g-${b.id}`} className="text-lg font-bold text-ink">
                {b.nama}
              </h2>
              <p className="angka mt-0.5 text-sm text-tinta-redup">
                {formatTanggal(b.buka)} sampai {formatTanggal(b.tutup)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!b.isActive && <Badge nada="netral">Nonaktif</Badge>}
              {b.isActive && <Badge nada={NADA[b.status]}>{LABEL[b.status]}</Badge>}
              <span className="angka text-sm font-semibold text-tinta">
                {b.terisi}
                {b.kuota !== null ? ` / ${b.kuota}` : ""} pendaftar
              </span>
            </div>
          </div>
          {buka === b.id ? (
            <div className="mt-4 border-t border-garis pt-4">
              <BarisForm awal={dariBaris(b)} baris={b} onSelesai={() => setBuka(null)} />
            </div>
          ) : (
            <Button type="button" varian="bingkai" className="mt-4" onClick={() => setBuka(b.id)}>
              Ubah gelombang
            </Button>
          )}
        </section>
      ))}

      {buka === "baru" ? (
        <section aria-labelledby="g-baru" className="rounded-kartu border-2 border-primer bg-permukaan p-4 sm:p-5">
          <h2 id="g-baru" className="text-lg font-bold text-ink">
            Gelombang baru
          </h2>
          <div className="mt-4">
            <BarisForm awal={{ nama: `Gelombang ${awal.length + 1}`, buka: "", tutup: "", kuota: "", isActive: true }} onSelesai={() => setBuka(null)} />
          </div>
        </section>
      ) : (
        <div>
          <Button type="button" onClick={() => setBuka("baru")}>
            Tambah gelombang
          </Button>
        </div>
      )}
    </div>
  );
}
