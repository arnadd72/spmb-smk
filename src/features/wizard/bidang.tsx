"use client";

import { useId } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import type { DefinisiField } from "./schema-client";

type Props = {
  f: DefinisiField;
  nilai: unknown;
  onChange: (kunci: string, nilai: unknown) => void;
  galat?: string;
  disabled?: boolean;
};

const teks = (v: unknown) => (v === undefined || v === null ? "" : String(v));

/** Satu field formulir sesuai tipenya (form builder dinamis, PRD 10.4). */
export function Bidang({ f, nilai, onChange, galat, disabled }: Props) {
  const id = useId();

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
        </legend>
        <div className="mt-1.5 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-6">
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
        {galat && <PesanGalat id={`${id}-galat`} pesan={galat} />}
      </fieldset>
    );
  }

  const lebar = f.tipe === "textarea" ? "sm:col-span-2" : undefined;
  return (
    <Field label={f.label} wajib={f.wajib} bantuan={f.teksBantuan ?? undefined} galat={galat} className={lebar}>
      {f.tipe === "select" ? (
        <Select
          opsi={f.opsi ?? []}
          nilai={teks(nilai)}
          onChange={(v) => onChange(f.kunci, v)}
          disabled={disabled}
          name={f.kunci}
        />
      ) : f.tipe === "textarea" ? (
        <Textarea value={teks(nilai)} onChange={(e) => onChange(f.kunci, e.target.value)} disabled={disabled} name={f.kunci} />
      ) : (
        <Input
          name={f.kunci}
          type={f.tipe === "date" ? "date" : f.tipe === "email" ? "email" : f.tipe === "tel" ? "tel" : "text"}
          inputMode={f.tipe === "number" ? "numeric" : f.kunci === "nisn" || f.kunci === "nik" || f.kunci === "no_kk" ? "numeric" : undefined}
          autoComplete={AUTOFILL[f.kunci]}
          value={teks(nilai)}
          onChange={(e) => onChange(f.kunci, e.target.value)}
          disabled={disabled}
          placeholder={f.placeholder ?? undefined}
          className={cn(f.tipe === "number" && "max-w-40")}
        />
      )}
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
