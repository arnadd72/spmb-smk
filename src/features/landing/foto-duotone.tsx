import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/cn";

type Props = Omit<ImageProps, "className"> & {
  className?: string;
  /** Kelas untuk pembungkus (ukuran, clip-path, dll). */
  pembungkus?: string;
  /** Kekuatan perlakuan duotone. "lembut" menyisakan sedikit warna asli. */
  nada?: "penuh" | "lembut";
};

/**
 * Perlakuan duotone hijau-kertas yang konsisten untuk semua foto sekolah (PRD 16.2).
 * Foto jadi hitam putih, bayangan dipetakan ke hijau gelap, sorotan ke warna kertas.
 */
export function FotoDuotone({ className, pembungkus, nada = "penuh", alt, ...sisa }: Props) {
  return (
    <div className={cn("relative isolate overflow-hidden bg-hijau-tua", pembungkus)}>
      <Image
        alt={alt}
        className={cn("object-cover", nada === "penuh" ? "grayscale contrast-110" : "grayscale-[0.85] contrast-105", className)}
        {...sisa}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-hijau-tua mix-blend-lighten" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-kertas mix-blend-multiply opacity-95" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-primer mix-blend-soft-light opacity-40"
      />
    </div>
  );
}
