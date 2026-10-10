import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-kontrol bg-permukaan-alt", className)} />;
}

/** Status proses OCR: skeleton + teks, bukan spinner kosong (PRD 16.6). */
export function SkeletonProses({ teks = "Membaca dokumen..." }: { teks?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-kartu border border-garis p-5">
      <p className="text-sm font-semibold text-tinta-redup">{teks}</p>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-4/5" />
    </div>
  );
}
