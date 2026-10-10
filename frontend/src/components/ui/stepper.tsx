import { cn } from "@/lib/cn";

type StepperProps = {
  langkah: number;
  total: number;
  nama: string;
  /** Menempel di atas pada mobile (PRD 10.4). */
  menempel?: boolean;
};

/** "Langkah X dari N · Nama langkah" dengan penanda progres. */
export function Stepper({ langkah, total, nama, menempel = false }: StepperProps) {
  return (
    <nav
      aria-label="Progres pendaftaran"
      className={cn(
        "border-b border-garis bg-latar/95 px-4 py-3 backdrop-blur-sm",
        menempel && "sticky top-0 z-30",
      )}
    >
      <p className="text-sm font-semibold text-tinta" aria-current="step">
        Langkah <span className="angka">{langkah}</span> dari <span className="angka">{total}</span> · {nama}
      </p>
      <ol className="mt-2 flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <li
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i + 1 < langkah ? "bg-primer" : i + 1 === langkah ? "bg-aksen" : "bg-permukaan-alt",
            )}
          />
        ))}
      </ol>
    </nav>
  );
}
