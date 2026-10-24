"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bidang } from "@/features/wizard/bidang";
import { NAMA_LANGKAH, fieldBiasa, skemaLangkah, type DefinisiField } from "@/features/wizard/schema-client";
import { ApiError, apiFetch } from "@/lib/api-client";

const TANPA = "-";

type Props = { fields: DefinisiField[] };

/** Input manual pendaftar luring: isian sama dengan wizard, berkas diunggah sesudah tersimpan. */
export function FormInputManual({ fields }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const langkahAda = [...new Set(fields.map((f) => f.langkah))].sort((a, b) => a - b);
  const fieldTampil = fields.map((f) => (f.kunci === "jurusan_2" ? { ...f, opsi: [{ nilai: TANPA, label: "Tidak ada pilihan kedua" }, ...(f.opsi ?? [])] } : f));

  const [nilai, setNilai] = useState<Record<string, unknown>>(() => {
    const d: Record<string, unknown> = {};
    for (const f of fields) if (f.tipe !== "tabel") d[f.kunci] = f.kunci === "jurusan_2" ? TANPA : f.tipe === "checkbox" ? false : "";
    return d;
  });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [sibuk, setSibuk] = useState(false);

  function ubah(kunci: string, v: unknown) {
    setNilai((n) => ({ ...n, [kunci]: v }));
    setGalat((g) => (g[kunci] ? { ...g, [kunci]: "" } : g));
  }

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    setGalatUmum(undefined);
    const isi: Record<string, unknown> = { ...nilai };
    if (isi.jurusan_2 === TANPA) isi.jurusan_2 = "";

    const peta: Record<string, string> = {};
    for (const n of langkahAda) {
      const r = skemaLangkah([...fields], n).safeParse({ ...isi, setuju: true });
      if (!r.success) for (const i of r.error.issues) peta[i.path.join(".")] ??= i.message;
    }

    setGalat(peta);
    if (Object.keys(peta).length > 0) {
      setGalatUmum("Ada isian yang perlu diperbaiki.");
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }

    setSibuk(true);
    try {
      const h = await apiFetch<{ id: string }>("/admin/peserta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isi) });
      router.push(`/admin/peserta/${h.id}?baru=1`);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const dari: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.errors)) dari[k] = v[0];
        setGalat(dari);
        setGalatUmum("Ada isian yang perlu diperbaiki.");
      } else setGalatUmum(err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server.");
      setSibuk(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={kirim} noValidate className="flex flex-col gap-8">
      {langkahAda.map((l) => {
        return (
          <section key={l} aria-labelledby={`bagian-${l}`}>
            <h2 id={`bagian-${l}`} className="border-b border-garis pb-2 text-lg font-bold text-ink">
              {NAMA_LANGKAH[l - 1]}
            </h2>
            <div className="mt-4 grid gap-x-5 gap-y-5 sm:grid-cols-2">
              {fieldBiasa(fieldTampil, l).map((f) => (
                <Bidang key={f.kunci} f={f} nilai={nilai[f.kunci]} onChange={ubah} galat={galat[f.kunci] || undefined} />
              ))}
            </div>
          </section>
        );
      })}

      <p className="text-sm text-tinta-redup">Pendaftar langsung berstatus Diterima. Berkas (akta, KK, pas foto) dapat diunggah dari halaman detail setelah data tersimpan.</p>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-garis bg-latar/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between lg:-mx-6 lg:px-6">
        <div className="min-h-6 text-sm" aria-live="polite">
          {galatUmum && (
            <p role="alert" className="font-semibold text-bahaya">
              {galatUmum}
            </p>
          )}
        </div>
        <Button type="submit" memuat={sibuk}>
          {sibuk ? "Menyimpan" : "Simpan pendaftar luring"}
        </Button>
      </div>
    </form>
  );
}
