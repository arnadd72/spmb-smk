import Image from "next/image";
import type { AriaAttributes } from "react";

type Props = {
  src: string;
  alt?: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
} & AriaAttributes &
  Record<`data-${string}`, string | undefined>;

/**
 * Logo dan gambar kecil yang bisa diganti admin. Berkas situs ("/images/...") dan gambar Drive ("/api/v1/media/...") dioptimasi
 * next/image; alamat https luar dimuat apa adanya agar tidak melempar galat host.
 */
export function GambarLogo({ src, alt = "", width, height, className, priority, ...rest }: Props) {
  if (src.startsWith("/")) return <Image src={src} alt={alt} width={width} height={height} className={className} priority={priority} {...rest} />;
  // eslint-disable-next-line @next/next/no-img-element -- alamat eksternal pilihan admin
  return <img src={src} alt={alt} width={width} height={height} className={className} loading={priority ? "eager" : "lazy"} {...rest} />;
}
