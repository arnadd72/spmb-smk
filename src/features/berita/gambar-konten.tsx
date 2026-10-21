import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Gambar konten dari admin. Path situs (diawali "/") dan host Supabase publik (next.config remotePatterns)
 * dioptimasi next/image; alamat https lain dimuat apa adanya agar tidak melempar galat host.
 */
export function GambarKonten({ src, alt, sizes, prioritas, className }: { src: string; alt: string; sizes: string; prioritas?: boolean; className?: string }) {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bisaDioptimasi = src.startsWith("/") || (supabase ? src.startsWith(supabase) : false);

  if (bisaDioptimasi) return <Image src={src} alt={alt} fill sizes={sizes} priority={prioritas} className={cn("object-cover", className)} />;

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={prioritas ? "eager" : "lazy"} className={cn("absolute inset-0 size-full object-cover", className)} />;
}
