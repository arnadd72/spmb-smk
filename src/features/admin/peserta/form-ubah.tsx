"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bidang } from "@/features/wizard/bidang";
import { NAMA_LANGKAH, fieldBiasa, skemaLangkah, type DefinisiField } from "@/features/wizard/schema-client";
import { ApiError, apiFetch } from "@/lib/api-client";

const TANPA = "-";

type Props = { id: string; fields: DefinisiField[]; nilai: Record<string, unknown> };

/** Form ubah data pendaftar oleh panitia. Aturan sama dengan wizard; server tetap otoritatif. */
export function FormUbahPeserta({ id, fields, nilai: awal }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const langkahAda = [...new Set(fields.map((f) => f.langkah))].sort((a, b) => a - b);

  // jurusan_2 boleh dikosongkan: Select tidak menerima nilai kosong, pakai penanda "-".
  const fieldTampil = fields.map((f) =>
    f.kunci === "jurusan_2" ? { ...f, opsi: [{ nilai: TANPA, label: "Tidak ada pilihan kedua" }, ...(f.opsi ?? [])] } : f,
  );

  const [nilai, setNilai] = useState<Record<string, unknown>>(() => {
    const dasar: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.tipe === "tabel") continue;
      const v = awal[f.kunci];
      dasar[f.kunci] = f.kunci === "jurusan_2" && !v ? TANPA : (v ?? "");
    }
    return dasar;
  });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [berhasil, setBerhasil] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);

  function ubah(kunci: string, v: unknown) {
    setNilai((n) => ({ ...n, [kunci]: v }));
    setGalat((g) => (g[kunci] ? { ...g, [kunci]: "" } : g));
    setBerhasil(undefined);
  }

  function muatan(): Record<string, unknown> {
    const hasil: Record<string, unknown> = { ...nilai };
    if (hasil.jurusan_2 === TANPA) hasil.jurusan_2 = "";
    return hasil;
  }

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    setGalatUmum(undefined);
    setBerhasil(undefined);
    const isi = muatan();

    const peta: Record<string, string> = {};
    for (const n of langkahAda) {
      const r = skemaLangkah([...fields], n).safeParse({ ...isi, setuju: true });
      if (!r.success) for (const i of r.error.issues) peta[i.path.join(".")] ??= i.message;
    }
    if (Object.keys(peta).length > 0) {
      setGalat(peta);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }

    setMenyimpan(true);
    try {
      const hasil = await apiFetch<{ berubah: string[] }>(`/admin/peserta/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isi),
      });
      setBerhasil(hasil.berubah.length === 0 ? "Tidak ada perubahan." : `Tersimpan: ${hasil.berubah.length} isian diubah.`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const dari: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.errors)) dari[k] = v[0];
        setGalat(dari);
        setGalatUmum("Ada isian yang perlu diperbaiki.");
      } else {
        setGalatUmum(err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server.");
      }
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={kirim} noValidate className="flex flex-col gap-8">
      {langkahAda.map((l) => {
        const daftar = fieldBiasa(fieldTampil, l);
        return (
          <section key={l} aria-labelledby={`bagian-${l}`}>
            <h2 id={`bagian-${l}`} className="border-b border-garis pb-2 text-lg font-bold text-ink">
              {NAMA_LANGKAH[l - 1]}
            </h2>
            <div className="mt-4 grid gap-x-5 gap-y-5 sm:grid-cols-2">
              {daftar.map((f) => (
                <Bidang key={f.kunci} f={f} nilai={nilai[f.kunci]} onChange={ubah} galat={galat[f.kunci] || undefined} />
              ))}
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-garis bg-latar/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between lg:-mx-6 lg:px-6">
        <div className="min-h-6 text-sm" aria-live="polite">
          {galatUmum && <p role="alert" className="font-semibold text-bahaya">{galatUmum}</p>}
          {berhasil && <p className="font-semibold text-sukses">{berhasil}</p>}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Link
            href={`/admin/peserta/${id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-kontrol border border-garis px-4 text-sm font-semibold hover:bg-permukaan-alt"
          >
            Kembali ke detail
          </Link>
          <Button type="submit" memuat={menyimpan}>
            {menyimpan ? "Menyimpan" : "Simpan perubahan"}
          </Button>
        </div>
      </div>
    </form>
  );
}
