"use client";

import { useId, useState } from "react";
import { FileTextIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { PesanAngka, useIsianAngka } from "./pesan-angka";
import { aturanAngka, type DefinisiField } from "./schema-client";

type Props = {
  f: DefinisiField;
  nilai: unknown;
  onChange: (kunci: string, nilai: unknown) => void;
  galat?: string;
  disabled?: boolean;
  /** Nilai ini terisi otomatis dari dokumen (OCR) dan belum diubah pendaftar. */
  dariDokumen?: boolean;
};

const teks = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const kapitalSemua = (nilai: string) => nilai.toLocaleUpperCase("id-ID");
const KUNCI_ANGKA_SAJA = new Set(["nisn", "nik", "nik_ayah", "nik_ibu", "no_kk", "rt", "rw", "ortu_rt", "ortu_rw", "lama_belajar"]);
/** Nomor telepon: hanya angka, paling banyak 13 digit (aturan 9 sampai 13 digit diperiksa skema form di klien dan server). */
const PANJANG_TELEPON = 13;

function batasPanjang(f: DefinisiField): number | undefined {
  // NIK, Nomor KK, NISN, dan telepon dipotong sendiri setelah huruf dan spasi dibuang (maxLength menghitungnya sebagai karakter).
  if (aturanAngka(f.kunci, f.tipe)) return undefined;
  if (f.kunci === "nisn") return 10;
  if (f.kunci === "lama_belajar") return 1;
  if (["tinggi_badan", "berat_badan"].includes(f.kunci)) return 3;
  if (["rt", "rw", "ortu_rt", "ortu_rw"].includes(f.kunci)) return 3;
  if (["nik", "nik_ayah", "nik_ibu", "no_kk"].includes(f.kunci)) return 16;
  switch (f.tipe) {
    case "tel": return PANJANG_TELEPON;
    case "email": return 255;
    case "textarea": return 1000;
    case "number": return 6;
    case "text": return 255;
    default: return undefined;
  }
}

/** Satu field formulir sesuai tipenya (form builder dinamis, PRD 10.4). */
export function Bidang({ f, nilai, onChange, galat, disabled, dariDokumen }: Props) {
  const id = useId();
  const [lainnyaDipilih, setLainnyaDipilih] = useState(false);
  const aturan = aturanAngka(f.kunci, f.tipe);
  const isianAngka = useIsianAngka(aturan, teks(nilai), (v) => onChange(f.kunci, v));
  const tandaDokumen = dariDokumen ? (
    <p className="flex items-center gap-1.5 text-sm font-medium text-info">
      <FileTextIcon aria-hidden weight="duotone" className="size-4 shrink-0" />
      Dari dokumen. Periksa kembali.
    </p>
  ) : null;

  if (f.kunci === "referensi_pendaftar" && f.tipe === "text" && f.opsi?.length) {
    const labelLainnya = "Lainnya (tulis sendiri)";
    const pilihanLainnya = f.opsi.find((o) => o.nilai === labelLainnya);
    const pilihanBiasa = f.opsi.filter((o) => o.nilai !== labelLainnya);
    const nilaiSekarang = teks(nilai);
    const nilaiPreset = pilihanBiasa.some((o) => o.nilai === nilaiSekarang);
    const lainnyaAktif = lainnyaDipilih || (nilaiSekarang !== "" && !nilaiPreset);

    return (
      <fieldset className="sm:col-span-2" aria-describedby={galat ? `${id}-galat` : undefined}>
        <legend className="text-sm font-semibold text-tinta">
          {f.label}
          {f.wajib && <span aria-hidden className="ml-0.5 text-bahaya">*</span>}
          {f.wajib && <span className="sr-only"> (wajib diisi)</span>}
          {!f.wajib && <span className="ml-1 font-normal text-tinta-redup">(opsional)</span>}
        </legend>
        {f.teksBantuan && <p className="mt-1 text-sm text-tinta-redup">{f.teksBantuan}</p>}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {pilihanBiasa.map((o) => (
            <label
              key={o.nilai}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-kontrol border px-3 py-2 text-sm font-medium",
                nilaiSekarang === o.nilai ? "border-primer bg-mint text-ink" : "border-garis bg-permukaan text-tinta hover:bg-permukaan-alt",
              )}
            >
              <input
                type="radio"
                name={f.kunci}
                value={o.nilai}
                checked={nilaiSekarang === o.nilai}
                onChange={() => {
                  setLainnyaDipilih(false);
                  onChange(f.kunci, o.nilai);
                }}
                disabled={disabled}
                className="size-4 shrink-0 accent-primer"
              />
              {o.label}
            </label>
          ))}
          {pilihanLainnya && (
            <label
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-kontrol border px-3 py-2 text-sm font-medium",
                lainnyaAktif ? "border-primer bg-mint text-ink" : "border-garis bg-permukaan text-tinta hover:bg-permukaan-alt",
              )}
            >
              <input
                type="radio"
                name={f.kunci}
                value={labelLainnya}
                checked={lainnyaAktif}
                onChange={() => {
                  setLainnyaDipilih(true);
                  onChange(f.kunci, "");
                }}
                disabled={disabled}
                className="size-4 shrink-0 accent-primer"
              />
              {pilihanLainnya.label}
            </label>
          )}
        </div>
        {lainnyaAktif && (
          <label className="mt-3 flex max-w-xl flex-col gap-1.5 text-sm font-semibold text-tinta">
            Tulis sumber lainnya
            <Input
              id={`${id}-lainnya`}
              name={f.kunci}
              value={nilaiPreset ? "" : nilaiSekarang}
              maxLength={255}
              onChange={(e) => onChange(f.kunci, kapitalSemua(e.target.value))}
              disabled={disabled}
              placeholder="Contoh: kunjungan ke sekolah"
            />
          </label>
        )}
        {galat && <PesanGalat id={`${id}-galat`} pesan={galat} />}
      </fieldset>
    );
  }

  if (f.tipe === "checkbox") {
    return (
      <div className="sm:col-span-2">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-base text-tinta">
          <input
            type="checkbox"
            checked={nilai === true}
            onChange={(e) => onChange(f.kunci, e.target.checked)}
            aria-invalid={galat ? true : undefined}
            aria-describedby={galat ? `${id}-galat` : undefined}
            className="mt-1 size-5 shrink-0 accent-primer"
          />
          <span>{f.label}</span>
        </label>
        {galat && <PesanGalat id={`${id}-galat`} pesan={galat} />}
      </div>
    );
  }

  if (f.tipe === "radio") {
    return (
      <fieldset className="sm:col-span-2" aria-describedby={galat ? `${id}-galat` : undefined}>
        <legend className="text-sm font-semibold text-tinta">
          {f.label}
          {f.wajib && <span aria-hidden className="ml-0.5 text-bahaya">*</span>}
          {f.wajib && <span className="sr-only"> (wajib diisi)</span>}
          {!f.wajib && <span className="ml-1 font-normal text-tinta-redup">(opsional)</span>}
        </legend>
        <div
          className={cn(
            "mt-1.5 gap-x-6 gap-y-1",
            f.kunci === "penghasilan" ? "grid grid-cols-1 sm:grid-cols-2" : "flex flex-col sm:flex-row sm:flex-wrap",
          )}
        >
          {f.opsi?.map((o) => (
            <label key={o.nilai} className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-tinta">
              <input
                type="radio"
                name={f.kunci}
                value={o.nilai}
                checked={nilai === o.nilai}
                onChange={() => onChange(f.kunci, o.nilai)}
                disabled={disabled}
                className="size-5 accent-primer"
              />
              {o.label}
            </label>
          ))}
        </div>
        {f.teksBantuan && <p className="text-sm text-tinta-redup">{f.teksBantuan}</p>}
        {tandaDokumen}
        {galat && <PesanGalat id={`${id}-galat`} pesan={galat} />}
      </fieldset>
    );
  }

  const lebar = f.tipe === "textarea" ? "sm:col-span-2" : undefined;
  const satuan = f.kunci === "tinggi_badan" ? "cm" : f.kunci === "berat_badan" ? "kg" : f.kunci === "lama_belajar" ? "tahun" : undefined;
  const angkaSaja = f.tipe === "number" || f.tipe === "tel" || KUNCI_ANGKA_SAJA.has(f.kunci);
  const input = (
    <Input
      name={f.kunci}
      type={f.tipe === "date" ? "date" : f.tipe === "email" ? "email" : f.tipe === "tel" ? "tel" : "text"}
      inputMode={angkaSaja ? "numeric" : undefined}
      autoComplete={AUTOFILL[f.kunci]}
      autoCapitalize={f.tipe === "email" ? "none" : undefined}
      {...isianAngka.propsInput}
      value={teks(nilai)}
      maxLength={batasPanjang(f)}
      onChange={(e) =>
        aturan
          ? isianAngka.saatUbah(e.target.value)
          : onChange(f.kunci, angkaSaja ? e.target.value.replace(/\D/g, "") : f.tipe === "text" ? kapitalSemua(e.target.value) : e.target.value)
      }
      disabled={disabled}
      placeholder={f.kunci === "lama_belajar" ? undefined : f.placeholder ?? undefined}
      className={cn((f.tipe === "number" || satuan) && "max-w-40", satuan && "pr-12")}
    />
  );
  return (
    <Field label={f.label} wajib={f.wajib} opsional={!f.wajib} bantuan={f.teksBantuan ?? undefined} galat={galat} className={lebar}>
      {f.tipe === "select" ? (
        <Select
          opsi={f.opsi ?? []}
          nilai={teks(nilai)}
          onChange={(v) => onChange(f.kunci, v)}
          disabled={disabled}
          name={f.kunci}
        />
      ) : f.tipe === "textarea" ? (
        <Textarea value={teks(nilai)} maxLength={1000} onChange={(e) => onChange(f.kunci, kapitalSemua(e.target.value))} disabled={disabled} name={f.kunci} />
      ) : (
        satuan ? (
          <div className="relative max-w-40">
            {input}
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-tinta-redup">{satuan}</span>
          </div>
        ) : input
      )}
      {aturan && isianAngka.status && <PesanAngka aturan={aturan} status={isianAngka.status} dibuang={isianAngka.dibuang} />}
      {tandaDokumen}
    </Field>
  );
}

const AUTOFILL: Record<string, string> = {
  nama_lengkap: "name",
  tanggal_lahir: "bday",
  no_hp: "tel",
  email: "email",
};

export function PesanGalat({ id, pesan }: { id?: string; pesan: string }) {
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1.5 text-sm font-medium text-bahaya">
      <WarningCircleIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
      {pesan}
    </p>
  );
}
