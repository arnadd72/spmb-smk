import Link from "next/link";
import { TesMinatBakat } from "@/features/tes-minat/tes-minat-bakat";

export const metadata = {
  title: "Tes minat dan bakat",
  description: "Tes singkat 15 pertanyaan untuk membantu calon siswa mengenali jurusan SMK yang sesuai dengan minatnya.",
};

export default function HalamanTesMinatBakat() {
  return (
    <div className="bg-mint py-12 text-ink lg:py-20">
      <div className="wadah grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <h1 className="max-w-[16ch] text-[clamp(1.9rem,3.8vw,3.5rem)] font-bold leading-[1.08] tracking-[-0.015em]">
            Tes minat dan bakat calon siswa SMK
          </h1>
          <p className="mt-5 max-w-[48ch] text-base text-ink/80 lg:text-lg">
            Pilih jawaban yang paling sesuai dengan minat, kebiasaan, atau cara kamu menyelesaikan masalah. Tidak ada jawaban benar atau salah.
          </p>
          <p className="mt-3 max-w-[48ch] text-sm font-semibold text-ink/80">Tes ini hanya memberi gambaran awal dan tidak menentukan penerimaan atau pilihan jurusanmu.</p>
          <Link href="/#jurusan" className="mt-6 inline-block min-h-11 py-2.5 text-sm font-semibold text-primer-tua underline underline-offset-2">
            Lihat penjelasan tiap jurusan
          </Link>
        </div>
        <TesMinatBakat />
      </div>
    </div>
  );
}
