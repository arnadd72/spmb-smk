import { cn } from "@/lib/cn";

/** Grafik batang jumlah pendaftar per hari. Murni CSS; ringkasan teks untuk pembaca layar. */
export function GrafikPerHari({ data }: { data: { tanggal: string; jumlah: number }[] }) {
  const maks = Math.max(1, ...data.map((d) => d.jumlah));
  const jumlah = data.reduce((a, d) => a + d.jumlah, 0);
  const puncak = data.reduce((a, d) => (d.jumlah > a.jumlah ? d : a), data[0]);

  return (
    <figure>
      <div
        role="img"
        aria-label={`Pendaftar per hari selama ${data.length} hari terakhir: total ${jumlah}, tertinggi ${puncak?.jumlah ?? 0} pada ${puncak?.tanggal ?? "-"}.`}
        className="flex h-40 items-end gap-[3px]"
      >
        {data.map((d) => (
          <div key={d.tanggal} className="flex h-full flex-1 items-end" title={`${d.tanggal}: ${d.jumlah}`}>
            <div
              className={cn("w-full rounded-t-sm", d.jumlah > 0 ? "bg-primer" : "bg-permukaan-alt")}
              style={{ height: `${Math.max(d.jumlah > 0 ? 6 : 2, (d.jumlah / maks) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-xs text-tinta-redup">
        <span className="angka">{data[0]?.tanggal.slice(5)}</span>
        <span>
          Total <span className="angka font-semibold text-tinta">{jumlah}</span> dalam {data.length} hari
        </span>
        <span className="angka">{data[data.length - 1]?.tanggal.slice(5)}</span>
      </figcaption>
    </figure>
  );
}

export function BatangProgres({ persen, nada = "primer" }: { persen: number; nada?: "primer" | "peringatan" | "bahaya" }) {
  const warna = { primer: "bg-primer", peringatan: "bg-aksen", bahaya: "bg-bahaya" }[nada];
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-permukaan-alt" role="presentation">
      <div className={cn("h-full rounded-full", warna)} style={{ width: `${Math.min(100, Math.max(0, persen))}%` }} />
    </div>
  );
}
