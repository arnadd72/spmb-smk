"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

type FieldCtx = { id: string; describedBy?: string; galat: boolean };
const Ctx = createContext<FieldCtx | null>(null);

/** Props aksesibilitas untuk kontrol di dalam <Field>. */
export function useFieldProps() {
  const c = useContext(Ctx);
  return c
    ? { id: c.id, "aria-describedby": c.describedBy, "aria-invalid": c.galat || undefined }
    : {};
}

type FieldProps = {
  label: string;
  bantuan?: string;
  galat?: string;
  wajib?: boolean;
  /** Tampilkan keterangan "(opsional)" di samping label. */
  opsional?: boolean;
  children: ReactNode;
  className?: string;
};

/** Label di atas, bantuan di bawah, galat dekat field (PRD 16.6). Tanpa placeholder sebagai label. */
export function Field({ label, bantuan, galat, wajib, opsional, children, className }: FieldProps) {
  const id = useId();
  const idBantuan = bantuan ? `${id}-bantuan` : undefined;
  const idGalat = galat ? `${id}-galat` : undefined;
  const describedBy = [idBantuan, idGalat].filter(Boolean).join(" ") || undefined;

  return (
    <Ctx.Provider value={{ id, describedBy, galat: Boolean(galat) }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={id} className="text-sm font-semibold text-tinta">
          {label}
          {wajib && (
            <span aria-hidden className="ml-0.5 text-bahaya">
              *
            </span>
          )}
          {wajib && <span className="sr-only"> (wajib diisi)</span>}
          {opsional && !wajib && <span className="ml-1 font-normal text-tinta-redup">(opsional)</span>}
        </label>
        {children}
        {bantuan && (
          <p id={idBantuan} className="text-sm text-tinta-redup">
            {bantuan}
          </p>
        )}
        {galat && (
          <p id={idGalat} role="alert" className="flex items-start gap-1.5 text-sm font-medium text-bahaya">
            <WarningCircleIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
            {galat}
          </p>
        )}
      </div>
    </Ctx.Provider>
  );
}
