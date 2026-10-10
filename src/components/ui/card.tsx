import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Kartu hanya bila elevasi menyampaikan hierarki; selain itu pakai garis atau ruang kosong. */
export function Card({ className, ...sisa }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-kartu border border-garis bg-permukaan p-5 shadow-kartu sm:p-6", className)}
      {...sisa}
    />
  );
}
