"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea, kontrolDasar } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { skemaMapel } from "@/server/validasi/referensi";

type Mapel = { kode: string; nama: string; alias: string[]; kelompok: string; urutan: number; isActive: boolean; dipakaiBobot: number };
type Form = { kode: string; nama: string; alias: string; kelompok: string; isActive: boolean };

const KOSONG: Form = { kode: "", nama: "", alias: "", kelompok: "umum", isActive: true };
const LABEL_KELOMPOK: Record<string, string> = { umum: "Umum", madrasah: "Madrasah", mulok: "Muatan lokal" };

/** Daftar mata pelajaran beserta alias untuk pencocokan OCR rapor; tambah, ubah, nonaktifkan, hapus. */
export function PanelMapel({ mapel }: { mapel: Mapel[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<{ baru: boolean; form: Form }>();
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [sibuk, setSibuk] = useState(false);
  const [hapusKode, setHapusKode] = useState<string>();
  const [pesan, setPesan] = useState<string>();

  function buka(m?: Mapel) {
    setGalat({});
    setGalatUmum(undefined);
    setEdit(m ? { baru: false, form: { kode: m.kode, nama: m.nama, alias: m.alias.join("\n"), kelompok: m.kelompok, isActive: m.isActive } } : { baru: true, form: KOSONG });
  }

  async function simpan(e: SyntheticEvent) {
    e.preventDefault();
    if (!edit) return;
    const f = edit.form;
    const muatan = { kode: f.kode, nama: f.nama, alias: f.alias.split("\n").map((a) => a.trim()).filter(Boolean), kelompok: f.kelompok, isActive: f.isActive };
    const cek = skemaMapel.safeParse(muatan);
    if (!cek.success) {
      const peta: Record<string, string> = {};
      for (const i of cek.error.issues) peta[String(i.path[0])] ??= i.message;
      setGalat(peta);
      return;
    }
    setSibuk(true);
    setGalatUmum(undefined);
    try {
      await apiFetch(edit.baru ? "/admin/mapel" : `/admin/mapel/${f.kode}`, {
        method: edit.baru ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(muatan),
      });
      setEdit(undefined);
      setPesan(edit.baru ? "Mata pelajaran ditambahkan." : "Perubahan tersimpan.");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setGalat(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
      else setGalatUmum(err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server.");
    } finally {
      setSibuk(false);
    }
  }

  async function hapus() {
    if (!hapusKode) return;
    setSibuk(true);
    try {
      await apiFetch(`/admin/mapel/${hapusKode}`, { method: "DELETE" });
      setHapusKode(undefined);
      setPesan("Mata pelajaran dihapus.");
      router.refresh();
    } catch (err) {
      setHapusKode(undefined);
      setPesan(err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server.");
    } finally {
      setSibuk(false);
    }
  }

  const ubah = (k: keyof Form, v: string | boolean) => setEdit((x) => x && { ...x, form: { ...x.form, [k]: v } });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="min-h-5 text-sm font-semibold text-sukses">
          {pesan}
        </p>
        <Button onClick={() => buka()}>
          <PlusIcon aria-hidden weight="bold" className="size-5" />
          Tambah mata pelajaran
        </Button>
      </div>

      <div className="relative mt-4 overflow-x-auto rounded-kartu border border-garis bg-permukaan">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <caption className="sr-only">Daftar mata pelajaran</caption>
          <thead className="border-b border-garis bg-permukaan-alt text-tinta-redup">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Mata pelajaran</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Kelompok</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Alias (OCR)</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {mapel.map((m) => (
              <tr key={m.kode} className="border-b border-garis align-top last:border-0">
                <th scope="row" className="px-4 py-3 font-semibold text-tinta">
                  {m.nama}
                  <span className="block text-xs font-normal text-tinta-redup">
                    {m.kode} · dipakai {m.dipakaiBobot} jurusan
                  </span>
                </th>
                <td className="px-4 py-3">{LABEL_KELOMPOK[m.kelompok] ?? m.kelompok}</td>
                <td className="max-w-[18rem] px-4 py-3 text-tinta-redup">{m.alias.join(", ") || "-"}</td>
                <td className="px-4 py-3">{m.isActive ? <Badge nada="sukses">Aktif</Badge> : <Badge>Nonaktif</Badge>}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right">
                  <Button varian="hantu" aria-label={`Ubah ${m.nama}`} onClick={() => buka(m)}>
                    <PencilSimpleIcon aria-hidden className="size-5" />
                  </Button>
                  <Button varian="hantu" aria-label={`Hapus ${m.nama}`} onClick={() => setHapusKode(m.kode)}>
                    <TrashIcon aria-hidden className="size-5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog buka={Boolean(edit)} onBukaChange={(b) => !b && setEdit(undefined)} judul={edit?.baru ? "Tambah mata pelajaran" : "Ubah mata pelajaran"}>
        {edit && (
          <form onSubmit={simpan} noValidate className="flex flex-col gap-4">
            <Field label="Kode" wajib bantuan={edit.baru ? "Huruf kecil, angka, garis bawah. Tidak bisa diubah setelah disimpan." : "Kode tidak bisa diubah."} galat={galat.kode}>
              <Input value={edit.form.kode} onChange={(e) => ubah("kode", e.target.value)} disabled={!edit.baru} autoCapitalize="none" />
            </Field>
            <Field label="Nama" wajib galat={galat.nama}>
              <Input value={edit.form.nama} onChange={(e) => ubah("nama", e.target.value)} />
            </Field>
            <Field label="Alias" bantuan="Satu alias per baris: variasi penulisan di rapor untuk pencocokan OCR." galat={galat.alias}>
              <Textarea rows={4} value={edit.form.alias} onChange={(e) => ubah("alias", e.target.value)} />
            </Field>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-tinta">
              Kelompok
              <select value={edit.form.kelompok} onChange={(e) => ubah("kelompok", e.target.value)} className={cn(kontrolDasar, "font-normal")}>
                {Object.entries(LABEL_KELOMPOK).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-tinta">
              <input type="checkbox" checked={edit.form.isActive} onChange={(e) => ubah("isActive", e.target.checked)} className="size-5 accent-primer" />
              Aktif (dipakai di rapor dan saran jurusan)
            </label>
            {galatUmum && (
              <p role="alert" className="text-sm font-semibold text-bahaya">
                {galatUmum}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" varian="sekunder" onClick={() => setEdit(undefined)}>
                Batal
              </Button>
              <Button type="submit" memuat={sibuk}>
                Simpan
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <Dialog
        buka={Boolean(hapusKode)}
        onBukaChange={(b) => !b && setHapusKode(undefined)}
        judul="Hapus mata pelajaran?"
        deskripsi="Mata pelajaran yang masih dipakai bobot jurusan tidak bisa dihapus; nonaktifkan saja."
        aksi={
          <>
            <Button varian="sekunder" onClick={() => setHapusKode(undefined)}>
              Batal
            </Button>
            <Button varian="bahaya" memuat={sibuk} onClick={hapus}>
              Ya, hapus
            </Button>
          </>
        }
      />
    </div>
  );
}
