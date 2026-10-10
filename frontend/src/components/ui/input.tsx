"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { useFieldProps } from "./field";

export const kontrolDasar =
  "w-full min-h-11 rounded-kontrol border border-garis bg-permukaan px-3 text-base text-tinta " +
  "placeholder:text-tinta-redup/70 transition-colors disabled:cursor-not-allowed disabled:bg-permukaan-alt " +
  "aria-[invalid=true]:border-bahaya aria-[invalid=true]:border-2";

export function Input({ className, ...sisa }: InputHTMLAttributes<HTMLInputElement>) {
  const a11y = useFieldProps();
  return <input className={cn(kontrolDasar, className)} {...a11y} {...sisa} />;
}

export function Textarea({ className, ...sisa }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const a11y = useFieldProps();
  return <textarea rows={4} className={cn(kontrolDasar, "py-2", className)} {...a11y} {...sisa} />;
}
