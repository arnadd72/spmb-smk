import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/motion/reveal";
import { BlokDeskripsi } from "@/features/jurusan/blok-deskripsi";
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

/** Satu jurusan: panel warna berisi kode dan daya tampung, di sebelahnya (HP: di bawahnya) deskripsi lengkap yang mudah dibaca. */
function BlokJurusan({ j, urutan }: { j: JurusanDetail; urutan: number }) {
  const t = TAMPIL_JURUSAN[j.kode] ?? TAMPIL_STANDAR;
  const alamat = `/jurusan/${j.kode.toLowerCase()}`;

  return (
    <Reveal tunda={Math.min(urutan, 2) * 0.05}>
      <section
        id={j.kode.toLowerCase()}
        aria-labelledby={`judul-${j.kode}`}
        className="scroll-mt-24 overflow-hidden rounded-kartu border border-garis bg-permukaan lg:grid lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]"
      >
        <div className={cn("flex flex-col gap-5 p-5 sm:p-8", t.latar, t.teks)}>
          <p className={cn("font-display text-[clamp(3.5rem,14vw,5.5rem)] font-bold leading-[0.8] tracking-[-0.03em]", t.kode)}>
            {j.kode}
          </p>
          <h2 id={`judul-${j.kode}`} className="text-xl font-bold leading-tight sm:text-2xl">
            {j.nama}
          </h2>
          <dl className="mt-auto grid max-w-xs grid-cols-2 gap-3 pt-2 text-center lg:max-w-none">
            {[
              ["Kuota", j.kuota],
              ["Sisa kursi", j.sisa],
            ].map(([label, nilai]) => (
              <div key={label as string} className="rounded-kontrol bg-ink/15 px-3 py-2.5">
                <dd className="angka font-display text-2xl font-bold">{nilai}</dd>
                <dt className="text-xs font-semibold">{label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-6 p-5 sm:p-8 lg:p-10">
          <BlokDeskripsi teks={j.deskripsi} kelasTeks="text-tinta" kelasKartu="bg-permukaan-alt text-tinta" />

          {j.prospekKarir.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-tinta-redup">Prospek karier</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {j.prospekKarir.map((k, i) => (
                  <li key={i} className="rounded-full bg-permukaan-alt px-3.5 py-1.5 text-sm font-semibold text-ink">
                    {k}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href={alamat}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-kontrol bg-primer px-5 font-bold text-kertas transition-colors hover:bg-primer-tua sm:w-auto"
            >
              {j.keunggulan.length > 0 ? "Lihat keunggulan" : `Detail jurusan ${j.kode}`}
              <ArrowRightIcon aria-hidden weight="bold" className="size-5" />
            </Link>
            <Link
              href="/daftar"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-kontrol border border-garis px-5 font-bold text-ink transition-colors hover:bg-permukaan-alt sm:w-auto"
            >
              Daftar sekarang
            </Link>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

export default async function HalamanJurusan() {
  const jurusan = await muat();

  return (
    <div className="wadah py-10 lg:py-20">
      <h1 className="max-w-[16ch] text-[clamp(2rem,6vw,3.75rem)] font-semibold leading-[1] tracking-[-0.02em] text-ink">
        Program keahlian
      </h1>
      <p className="mt-4 max-w-[52ch] text-base text-tinta-redup sm:text-lg lg:mt-5 lg:text-xl">
        Pilih jurusan yang sesuai minatmu. Setiap jurusan menampilkan profil, daya tampung, dan prospek kariernya. Belum yakin? Coba tes minat
        bakat.
      </p>

      {jurusan.length === 0 ? (
        <div className="mt-12">
          <EmptyState judul="Data jurusan belum tersedia" deskripsi="Silakan kembali beberapa saat lagi." />
        </div>
      ) : (
        <>
          <nav aria-label="Loncat ke jurusan" className="mt-6 flex flex-wrap gap-2 lg:mt-8">
            {jurusan.map((j) => (
              <a
                key={j.kode}
                href={`#${j.kode.toLowerCase()}`}
                className="inline-flex min-h-11 items-center rounded-full border border-garis bg-permukaan px-4 text-sm font-bold text-ink transition-colors hover:bg-permukaan-alt"
              >
                {j.kode}
              </a>
            ))}
          </nav>

          <div className="mt-8 flex flex-col gap-6 lg:mt-12 lg:gap-8">
            {jurusan.map((j, i) => (
              <BlokJurusan key={j.kode} j={j} urutan={i} />
            ))}
          </div>

          <p className="mt-10 text-tinta-redup">
            Belum yakin memilih?{" "}
            <Link href="/tes-minat-bakat" className="inline-flex min-h-11 items-center font-semibold text-primer-tua underline underline-offset-4">
              Coba tes minat bakat
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
