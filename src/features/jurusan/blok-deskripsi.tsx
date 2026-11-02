import { cn } from "@/lib/cn";
import { bacaDeskripsi } from "@/lib/deskripsi-jurusan";
import type { KelompokKeunggulan } from "@/lib/keunggulan-jurusan";

/** Kolom berjajar ke samping sebanyak yang muat (tiap kolom minimal 16rem), baru turun bila layar sempit. */
export const JAJAR_SAMPING = "grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4";

/** Satu kelompok butir: judul kecil dan daftar berpenanda tulisan admin; baris panjang rata di bawah isinya, bukan di bawah nomor. */
export function KelompokButir({ k, kelas }: { k: KelompokKeunggulan; kelas?: string }) {
  return (
    <div className={cn("rounded-kartu p-5 sm:p-6", kelas)}>
      {k.judul && <h3 className="text-base font-bold leading-snug lg:text-lg">{k.judul}</h3>}
      {k.butir.length > 0 && (
        <ul role="list" className={cn("list-none space-y-2", k.judul && "mt-3")}>
          {k.butir.map((b, n) => (
            <li key={n} className="flex gap-2.5">
              {b.penanda && <span className="min-w-[2ch] shrink-0 font-semibold tabular-nums">{b.penanda}</span>}
              <span className="min-w-0">{b.isi}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Deskripsi jurusan: paragraf selebar penuh, daftar (kerja sama, tempat PKL, dst.) berjajar ke samping.
 * `kelasKartu` mewarnai kartu daftar sesuai latar tempatnya (hero berwarna atau permukaan terang).
 */
export function BlokDeskripsi({ teks, kelasTeks, kelasKartu }: { teks: string; kelasTeks?: string; kelasKartu: string }) {
  const blok = bacaDeskripsi(teks);
  if (blok.length === 0) return null;
  return (
    <div className="space-y-5">
      {blok.map((b, i) =>
        b.tipe === "paragraf" ? (
          <p key={i} className={cn("whitespace-pre-line text-base leading-relaxed sm:text-lg", kelasTeks)}>
            {b.teks}
          </p>
        ) : (
          <div key={i} className={JAJAR_SAMPING}>
            {b.daftar.map((k, n) => (
              <KelompokButir key={n} k={k} kelas={kelasKartu} />
            ))}
          </div>
        ),
      )}
    </div>
  );
}
