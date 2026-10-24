import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/motion/reveal";
import { TAMPIL_JURUSAN, TAMPIL_STANDAR } from "@/features/jurusan/tampil";
import { cn } from "@/lib/cn";
import { ambilDaftarJurusan, type JurusanDetail } from "@/server/actions/ambilPublik";

export const revalidate = 300;
export const metadata = {
  title: "Program keahlian",
  description: "Empat program keahlian SMK Ma'arif NU 1 Wangon: AKL, MPLB, LPK3, dan TKR.",
};

async function muat(): Promise<JurusanDetail[]> {
  try {
    return await ambilDaftarJurusan();
  } catch {
    return [];
  }
}

export default async function HalamanJurusan() {
  const jurusan = await muat();

  return (
    <div className="wadah py-12 lg:py-20">
      <h1 className="max-w-[16ch] text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1] tracking-[-0.02em] text-ink">
        Program keahlian
      </h1>
      <p className="mt-5 max-w-[52ch] text-lg text-tinta-redup lg:text-xl">
        Pilih jurusan yang sesuai minatmu. Setiap jurusan menampilkan daya tampung dan prospek kariernya. Belum yakin? Coba tes minat
        bakat.
      </p>

      {jurusan.length === 0 ? (
        <div className="mt-12">
          <EmptyState judul="Data jurusan belum tersedia" deskripsi="Silakan kembali beberapa saat lagi." />
        </div>
      ) : (
        <ul className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-2">
          {jurusan.map((j, i) => {
            const t = TAMPIL_JURUSAN[j.kode] ?? TAMPIL_STANDAR;
            return (
              <li key={j.kode} className="h-full">
                <Reveal tunda={i * 0.06} className="h-full">
                  <Link
                    href={`/jurusan/${j.kode.toLowerCase()}`}
                    className={cn(
                      "group flex h-full min-h-80 flex-col justify-start gap-8 rounded-kartu p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-9",
                      t.latar,
                      t.teks,
                    )}
                  >
                    <p className={cn("font-display text-[clamp(4rem,9vw,7.5rem)] font-bold leading-[0.8] tracking-[-0.03em]", t.kode)}>
                      {j.kode}
                    </p>
                    <div className="flex flex-1 flex-col">
                      <h2 className="text-2xl font-bold leading-tight sm:text-3xl">{j.nama}</h2>
                      <p className="mt-2 max-w-[44ch] font-medium">{j.deskripsi}</p>
                      <p className="mt-auto flex items-center justify-between gap-4 pt-4 font-bold">
                        <span className="angka">
                          Sisa {j.sisa} dari {j.kuota} kursi
                        </span>
                        <ArrowRightIcon aria-hidden weight="bold" className="size-6 transition-transform duration-300 group-hover:translate-x-1" />
                      </p>
                    </div>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
