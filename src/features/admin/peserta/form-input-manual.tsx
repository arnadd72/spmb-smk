"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, kontrolDasar } from "@/components/ui/input";
import { Bidang } from "@/features/wizard/bidang";
import { NAMA_LANGKAH, fieldBiasa, skemaLangkah, skemaNilaiRapor, type DefinisiField } from "@/features/wizard/schema-client";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";

const TANPA = "-";

type Props = { fields: DefinisiField[]; mapel: { kode: string; nama: string }[]; semester: number[] };

/** Input manual pendaftar luring: isian sama dengan wizard, nilai rapor opsional, berkas diunggah sesudah tersimpan. */
export function FormInputManual({ fields, mapel, semester }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const langkahAda = [...new Set(fields.map((f) => f.langkah))].sort((a, b) => a - b);
  const fieldTampil = fields.map((f) => (f.kunci === "jurusan_2" ? { ...f, opsi: [{ nilai: TANPA, label: "Tidak ada pilihan kedua" }, ...(f.opsi ?? [])] } : f));

  const [nilai, setNilai] = useState<Record<string, unknown>>(() => {
    const d: Record<string, unknown> = {};
    for (const f of fields) if (f.tipe !== "tabel") d[f.kunci] = f.kunci === "jurusan_2" ? TANPA : f.tipe === "checkbox" ? false : "";
    return d;
  });
  const [rapor, setRapor] = useState<Record<string, Record<string, string>>>(Object.fromEntries(mapel.map((m) => [m.kode, Object.fromEntries(semester.map((s) => [String(s), ""]))])));
  const [statusAwal, setStatusAwal] = useState<"approved" | "pending">("approved");
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [sibuk, setSibuk] = useState(false);

  function ubah(kunci: string, v: unknown) {
    setNilai((n) => ({ ...n, [kunci]: v }));
    setGalat((g) => (g[kunci] ? { ...g, [kunci]: "" } : g));
  }

  const muatanRapor = () => ({
    semester,
    mapel: Object.fromEntries(Object.entries(rapor).map(([k, sel]) => [k, Object.fromEntries(Object.entries(sel).map(([s, v]) => [s, v.replace(",", ".")]))])),
  });

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    setGalatUmum(undefined);
    const isi: Record<string, unknown> = { ...nilai, nilai_rapor: muatanRapor(), status_awal: statusAwal };
    if (isi.jurusan_2 === TANPA) isi.jurusan_2 = "";

    const peta: Record<string, string> = {};
    for (const n of langkahAda) {
      const r = skemaLangkah([...fields], n).safeParse({ ...isi, setuju: true });
      if (!r.success) for (const i of r.error.issues) peta[i.path.join(".")] ??= i.message;
    }
    const r = skemaNilaiRapor(semester, []).safeParse(muatanRapor());
    if (!r.success) for (const i of r.error.issues) peta[`nilai_rapor.${i.path.slice(1).join(".")}`] ??= i.message;

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

      <section aria-labelledby="bagian-rapor">
        <h2 id="bagian-rapor" className="border-b border-garis pb-2 text-lg font-bold text-ink">
          Nilai rapor <span className="text-sm font-normal text-tinta-redup">(opsional, dipakai untuk saran jurusan)</span>
        </h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {mapel.map((m) => (
            <li key={m.kode} className="rounded-kontrol border border-garis p-2.5">
              <p className="text-sm font-semibold text-tinta">{m.nama}</p>
              <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${semester.length}, minmax(0, 1fr))` }}>
                {semester.map((s) => (
                  <label key={s} className="flex flex-col gap-0.5 text-center text-xs font-semibold text-tinta-redup">
                    S{s}
                    <Input
                      inputMode="decimal"
                      aria-label={`${m.nama} semester ${s}`}
                      aria-invalid={galat[`nilai_rapor.${m.kode}.${s}`] ? true : undefined}
                      value={rapor[m.kode][String(s)]}
                      onChange={(e) => {
                        setRapor((r) => ({ ...r, [m.kode]: { ...r[m.kode], [s]: e.target.value } }));
                        setGalat((g) => ({ ...g, [`nilai_rapor.${m.kode}.${s}`]: "" }));
                      }}
                      className="angka px-1 text-center"
                    />
                  </label>
                ))}
              </div>
              {semester.map((s) => galat[`nilai_rapor.${m.kode}.${s}`] && (
                <p key={s} role="alert" className="mt-1 text-sm font-medium text-bahaya">
                  Semester {s}: {galat[`nilai_rapor.${m.kode}.${s}`]}
                </p>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="bagian-status">
        <h2 id="bagian-status" className="border-b border-garis pb-2 text-lg font-bold text-ink">
          Status awal
        </h2>
        <label className="mt-4 flex max-w-sm flex-col gap-1.5 text-sm font-semibold text-tinta">
          Status pendaftar
          <select value={statusAwal} onChange={(e) => setStatusAwal(e.target.value as "approved" | "pending")} className={cn(kontrolDasar, "font-normal")}>
            <option value="approved">Diterima (berkas diverifikasi langsung di tempat)</option>
            <option value="pending">Menunggu verifikasi</option>
          </select>
        </label>
        <p className="mt-2 text-sm text-tinta-redup">Berkas (akta, KK, rapor) dapat diunggah dari halaman detail setelah data tersimpan.</p>
      </section>

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
