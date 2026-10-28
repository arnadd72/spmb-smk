import Link from "next/link";
import { ArrowRightIcon, CheckCircleIcon, ListChecksIcon, LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";

const POIN = [
  { Ikon: ListChecksIcon, judul: "Pertanyaan pilihan ganda", isi: "Pilih satu dari empat jawaban (A sampai D) yang paling sesuai dengan dirimu." },
  { Ikon: CheckCircleIcon, judul: "Tidak ada jawaban benar atau salah", isi: "Jawab sesuai minat dan kebiasaanmu, bukan sesuai tebakan." },
  { Ikon: LockSimpleIcon, judul: "Hasil tidak disimpan", isi: "Hasil dihitung di HP kamu dan tidak dikirim ke panitia." },
];

/** Penjelasan singkat tes minat bakat di landing; tesnya sendiri ada di halaman /tes-minat-bakat. */
export function TesMinat() {
  return (
    <section id="tes-minat-bakat" aria-labelledby="judul-tes-minat" className="bg-mint py-16 text-ink lg:py-24">
      <div className="wadah grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <h2
            id="judul-tes-minat"
            className="max-w-[16ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[1.08] tracking-[-0.015em]"
          >
            Tes minat dan bakat calon siswa SMK
          </h2>
          <p className="mt-5 max-w-[48ch] text-base text-ink/80 lg:text-lg">
            Belum yakin jurusan mana yang cocok? Coba tes singkat ini untuk mendapat gambaran awal tentang minatmu.
          </p>
          <p className="mt-3 max-w-[48ch] text-sm font-semibold text-ink/80">Tes ini hanya memberi gambaran awal dan tidak menentukan penerimaan atau pilihan jurusanmu.</p>
          <Link
            href="/tes-minat-bakat"
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-kontrol bg-primer px-6 text-base font-semibold text-primer-tinta hover:bg-primer-tua"
          >
            Mulai tes minat bakat
            <ArrowRightIcon aria-hidden weight="bold" className="size-5" />
          </Link>
        </div>

        <ul className="flex flex-col gap-3">
          {POIN.map(({ Ikon, judul, isi }) => (
            <li key={judul} className="flex items-start gap-4 rounded-kartu bg-permukaan p-5 shadow-kartu">
              <Ikon aria-hidden weight="duotone" className="mt-0.5 size-7 shrink-0 text-primer" />
              <div>
                <p className="font-bold text-ink">{judul}</p>
                <p className="mt-1 text-sm text-tinta-redup">{isi}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
