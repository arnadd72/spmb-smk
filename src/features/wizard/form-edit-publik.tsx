"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bidang } from "@/features/wizard/bidang";
import { NAMA_LANGKAH, fieldBiasa, skemaLangkah, type DefinisiField } from "@/features/wizard/schema-client";
import { ApiError, apiFetch } from "@/lib/api-client";

type Props = { fields: DefinisiField[]; nilaiAwal: Record<string, unknown> };

export function FormEditPublik({ fields, nilaiAwal }: Props) {
  const router = useRouter();
  const langkahAda = [...new Set(fields.map((field) => field.langkah))].sort((a, b) => a - b);
  const [nilai, setNilai] = useState<Record<string, unknown>>(() => {
    const hasil: Record<string, unknown> = {};
    for (const field of fields) {
      const awal = nilaiAwal[field.kunci];
      hasil[field.kunci] = field.kunci === "jurusan_2" && !awal ? "-" : (awal ?? "");
    }
    return hasil;
  });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [pesanBerhasil, setPesanBerhasil] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);

  function ubah(kunci: string, v: unknown) {
    setNilai((lama) => ({ ...lama, [kunci]: v }));
    setGalat((lama) => (lama[kunci] ? { ...lama, [kunci]: "" } : lama));
    setPesanBerhasil(undefined);
  }

  async function simpan(e: SyntheticEvent) {
    e.preventDefault();
    setGalatUmum(undefined);
    setPesanBerhasil(undefined);
    const isi = { ...nilai, ...(nilai.jurusan_2 === "-" ? { jurusan_2: "" } : {}) };
    const peta: Record<string, string> = {};
    for (const langkah of langkahAda) {
      const hasil = skemaLangkah(fields, langkah).safeParse({ ...isi, setuju: true });
      if (!hasil.success) for (const isu of hasil.error.issues) peta[isu.path.join(".")] ??= isu.message;
    }
    if (Object.keys(peta).length) {
      setGalat(peta);
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    setMenyimpan(true);
    try {
      const hasil = await apiFetch<{ berubah: string[] }>("/edit-formulir", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isi),
      });
      await apiFetch<void>("/edit-formulir/akses", { method: "DELETE" }).catch(() => undefined);
      router.replace("/edit-formulir?berhasil=1");
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        const petaServer: Record<string, string> = {};
        for (const [kunci, pesan] of Object.entries(error.errors)) petaServer[kunci] = pesan[0];
        setGalat(petaServer);
        setGalatUmum("Ada isian yang perlu diperbaiki.");
      } else {
        setGalatUmum(error instanceof ApiError ? error.message : "Tidak dapat terhubung ke server.");
      }
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={simpan} noValidate className="flex flex-col gap-8">
      {langkahAda.map((langkah) => (
        <section key={langkah} aria-labelledby={"bagian-" + langkah}>
          <h2 id={"bagian-" + langkah} className="border-b border-garis pb-2 text-lg font-bold text-ink">
            {NAMA_LANGKAH[langkah - 1]}
          </h2>
          <div className="mt-4 grid gap-x-5 gap-y-5 sm:grid-cols-2">
            {fieldBiasa(fields, langkah).map((field) => (
              <Bidang key={field.kunci} f={field} nilai={nilai[field.kunci]} onChange={ubah} galat={galat[field.kunci] || undefined} />
            ))}
          </div>
        </section>
      ))}
      <p className="rounded-kontrol bg-permukaan-alt p-3 text-sm text-tinta-redup">
        Halaman ini mengubah data isian. Berkas unggahan dan jawaban tes minat bakat tidak diubah di sini.
      </p>
      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-garis bg-latar/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between lg:-mx-6 lg:px-6">
        <div className="min-h-6 text-sm" aria-live="polite">
          {galatUmum && <p role="alert" className="font-semibold text-bahaya">{galatUmum}</p>}
          {pesanBerhasil && <p className="font-semibold text-sukses">{pesanBerhasil}</p>}
        </div>
        <Button type="submit" memuat={menyimpan}>
          {menyimpan ? "Menyimpan" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  );
}
