import Link from "next/link";
import { TanyaPanitia } from "@/features/tanya/tanya-panitia";

// Layout wizard: ringan, tanpa navigasi situs (fokus mengisi). GSAP tidak dimuat di sini (PRD 16.5).
export default function LayoutDaftar({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-garis bg-latar">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="font-display text-base font-extrabold text-primer-tua">
            SMK Ma&apos;arif NU 1 Wangon
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-tinta-redup underline-offset-2 hover:underline"
          >
            Keluar
          </Link>
        </div>
      </header>
      <main id="konten" className="mx-auto w-full max-w-2xl flex-1 pb-24">
        {children}
      </main>
      <TanyaPanitia />
    </div>
  );
}
