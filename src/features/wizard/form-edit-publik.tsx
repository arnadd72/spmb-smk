"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { BooksIcon, FolderOpenIcon, IdentificationCardIcon, InfoIcon, StudentIcon, UserIcon, UsersThreeIcon, type Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Bidang } from "@/features/wizard/bidang";
import { BerkasEdit, type BerkasTersimpan } from "@/features/wizard/berkas-edit";
import { NAMA_LANGKAH, fieldBiasa, skemaLangkah, type DefinisiField } from "@/features/wizard/schema-client";
import { ApiError, apiFetch } from "@/lib/api-client";

type Props = { fields: DefinisiField[]; nilaiAwal: Record<string, unknown>; berkas: BerkasTersimpan[] };

/** Ikon tiap bagian, menurut nomor langkah wizard asal isiannya. */
const IKON: Record<number, Icon> = { 1: IdentificationCardIcon, 4: BooksIcon, 5: UserIcon, 6: UsersThreeIcon, 7: StudentIcon };

export function FormEditPublik({ fields, nilaiAwal, berkas }: Props) {
  const router = useRouter();
  const langkahAda = [...new Set(fields.map((field) => field.langkah))].sort((a, b) => a - b);
  const [awal] = useState<Record<string, unknown>>(() => {
    const hasil: Record<string, unknown> = {};
    for (const field of fields) {
      const nilaiLama = nilaiAwal[field.kunci];
      hasil[field.kunci] = field.kunci === "jurusan_2" && !nilaiLama ? "-" : (nilaiLama ?? "");
    }
    return hasil;
  });
  const [nilai, setNilai] = useState<Record<string, unknown>>(awal);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);
  const jumlahBerubah = Object.keys(nilai).filter((k) => nilai[k] !== awal[k]).length;

  function ubah(kunci: string, v: unknown) {
    setNilai((lama) => ({ ...lama, [kunci]: v }));
    setGalat((lama) => (lama[kunci] ? { ...lama, [kunci]: "" } : lama));
  }

  async function simpan(e: SyntheticEvent) {
    e.preventDefault();
    setGalatUmum(undefined);
    const isi = { ...nilai, ...(nilai.jurusan_2 === "-" ? { jurusan_2: "" } : {}) };
    const peta: Record<string, string> = {};
    for (const langkah of langkahAda) {
      const hasil = skemaLangkah(fields, langkah).safeParse({ ...isi, setuju: true });
      if (!hasil.success) for (const isu of hasil.error.issues) peta[isu.path.join(".")] ??= isu.message;
    }
    if (Object.keys(peta).length) {
      setGalat(peta);
      setGalatUmum("Ada isian yang perlu diperbaiki.");
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    setMenyimpan(true);
    try {
      await apiFetch<{ berubah: string[] }>("/edit-formulir", {
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
    <form onSubmit={simpan} noValidate className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
      {/* Daftar bagian di layar lebar: lompat cepat ke bagian yang ingin diubah. */}
      <nav aria-label="Bagian formulir" className="hidden lg:block">
        <div className="sticky top-24">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-tinta-redup">Bagian formulir</p>
          <ul className="mt-3 flex flex-col gap-1">
            <li>
              <a href="#bagian-berkas" className="flex min-h-11 items-center gap-3 rounded-kontrol px-3 text-sm font-medium text-tinta hover:bg-permukaan-alt">
                <FolderOpenIcon aria-hidden className="size-5 shrink-0 text-primer-tua" />
                <span className="min-w-0 flex-1">Berkas pendaftaran</span>
              </a>
            </li>
            {langkahAda.map((langkah) => {
              const Ikon = IKON[langkah] ?? InfoIcon;
              const adaGalat = fieldBiasa(fields, langkah).some((f) => galat[f.kunci]);
              return (
                <li key={langkah}>
                  <a
                    href={`#bagian-${langkah}`}
                    className="flex min-h-11 items-center gap-3 rounded-kontrol px-3 text-sm font-medium text-tinta hover:bg-permukaan-alt"
                  >
                    <Ikon aria-hidden className="size-5 shrink-0 text-primer-tua" />
                    <span className="min-w-0 flex-1">{NAMA_LANGKAH[langkah - 1]}</span>
                    {adaGalat && (
                      <span className="size-2 shrink-0 rounded-full bg-bahaya">
                        <span className="sr-only">(ada isian yang perlu diperbaiki)</span>
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 flex items-start gap-2 border-t border-garis pt-4 text-sm text-tinta-redup">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-primer" />
            Berkas langsung tersimpan begitu diunggah. Jawaban tes minat bakat tidak diubah di halaman ini.
          </p>
        </div>
      </nav>

      <div className="flex min-w-0 flex-col gap-5">
        {/* Berkas di atas: catatan panitia paling sering meminta foto KK atau akta diperbaiki. */}
        <section id="bagian-berkas" aria-labelledby="judul-bagian-berkas" className="scroll-mt-24 rounded-kartu border border-garis bg-permukaan p-5 sm:p-7">
          <h2 id="judul-bagian-berkas" className="flex items-center gap-3 text-lg font-bold text-ink">
            <span className="grid size-10 shrink-0 place-items-center rounded-kontrol bg-mint/60 text-primer-tua">
              <FolderOpenIcon aria-hidden className="size-5" />
            </span>
            Berkas pendaftaran
          </h2>
          <p className="mb-5 mt-2 text-sm text-tinta-redup">
            Ganti foto yang buram atau salah. JPG, PNG, atau WebP (akta dan KK boleh PDF), maksimal 5 MB. Berkas langsung tersimpan begitu diunggah.
          </p>
          <BerkasEdit awal={berkas} />
        </section>

        {langkahAda.map((langkah) => {
          const Ikon = IKON[langkah] ?? InfoIcon;
          return (
            <section
              key={langkah}
              id={`bagian-${langkah}`}
              aria-labelledby={`judul-bagian-${langkah}`}
              className="scroll-mt-24 rounded-kartu border border-garis bg-permukaan p-5 sm:p-7"
            >
              <h2 id={`judul-bagian-${langkah}`} className="flex items-center gap-3 text-lg font-bold text-ink">
                <span className="grid size-10 shrink-0 place-items-center rounded-kontrol bg-mint/60 text-primer-tua">
                  <Ikon aria-hidden className="size-5" />
                </span>
                {NAMA_LANGKAH[langkah - 1]}
              </h2>
              <div className="mt-5 grid gap-x-5 gap-y-5 sm:grid-cols-2">
                {fieldBiasa(fields, langkah).map((field) => (
                  <Bidang key={field.kunci} f={field} nilai={nilai[field.kunci]} onChange={ubah} galat={galat[field.kunci] || undefined} />
                ))}
              </div>
            </section>
          );
        })}

        <p className="flex items-start gap-2 rounded-kontrol bg-permukaan-alt p-3 text-sm text-tinta-redup lg:hidden">
          <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-primer" />
          Jawaban tes minat bakat tidak diubah di halaman ini.
        </p>

        {/* Menempel di atas tombol Tanya Sunan (pojok kanan bawah) agar tombol simpan tidak tertutup. */}
        <div className="sticky bottom-24 z-20 flex items-center justify-between gap-3 rounded-kartu border border-garis bg-permukaan/95 px-4 py-3 shadow-kartu backdrop-blur-sm xl:bottom-3">
          <div className="min-h-6 min-w-0 text-sm" aria-live="polite">
            {galatUmum ? (
              <p role="alert" className="font-semibold text-bahaya">
                {galatUmum}
              </p>
            ) : jumlahBerubah > 0 ? (
              <p className="font-semibold text-tinta">
                <span className="angka">{jumlahBerubah}</span> isian diubah, belum disimpan.
              </p>
            ) : (
              <p className="text-tinta-redup">Belum ada perubahan.</p>
            )}
          </div>
          <Button type="submit" memuat={menyimpan} disabled={jumlahBerubah === 0 && !galatUmum} className="shrink-0">
            {menyimpan ? "Menyimpan" : "Simpan perubahan"}
          </Button>
        </div>
      </div>
    </form>
  );
}
