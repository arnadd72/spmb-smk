import type { ButtonHTMLAttributes } from "react";
import { SpinnerGapIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

type Varian = "utama" | "aksen" | "sekunder" | "terang" | "gelap" | "hantu" | "bahaya";
type Ukuran = "md" | "lg";

const varian: Record<Varian, string> = {
  utama: "bg-primer text-primer-tinta hover:bg-primer-tua",
  // Kuning sekolah: untuk CTA utama atau sorotan.
  aksen: "bg-aksen text-aksen-tinta hover:brightness-95",
  sekunder: "border border-primer text-primer-tua bg-transparent hover:bg-permukaan-alt",
  // Tombol sekunder di atas latar hijau gelap.
  terang: "border border-kertas/60 bg-transparent text-kertas hover:bg-kertas/10",
  // Tombol pekat di atas latar terang.
  gelap: "bg-ink text-kertas hover:bg-ink/85",
  hantu: "text-primer-tua bg-transparent hover:bg-permukaan-alt",
  bahaya: "bg-bahaya text-white hover:brightness-90",
};

const ukuran: Record<Ukuran, string> = {
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  varian?: Varian;
  ukuran?: Ukuran;
  memuat?: boolean;
  /** Penuh lebar di mobile (PRD 16.6). */
  penuhMobile?: boolean;
};

export function Button({
  varian: v = "utama",
  ukuran: u = "md",
  memuat = false,
  penuhMobile = false,
  className,
  disabled,
  children,
  type = "button",
  ...sisa
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || memuat}
      aria-busy={memuat || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-kontrol font-semibold whitespace-nowrap",
        "transition-[background-color,transform,filter] duration-150 ease-keluar",
        "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55",
        varian[v],
        ukuran[u],
        penuhMobile && "w-full sm:w-auto",
        className,
      )}
      {...sisa}
    >
      {memuat && <SpinnerGapIcon aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
