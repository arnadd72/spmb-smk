import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

export function Penutup() {
  return (
    <section aria-labelledby="judul-penutup" className="relative overflow-hidden bg-primer-tua py-20 text-kertas lg:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 size-[32rem] rounded-full opacity-[0.1]"
        style={{
          background: "repeating-conic-gradient(from 0deg, var(--kertas) 0deg 6deg, transparent 6deg 12deg)",
          maskImage: "radial-gradient(circle, black 30%, transparent 70%)",
        }}
      />
      <Reveal className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <h2 id="judul-penutup" className="max-w-3xl text-4xl font-extrabold sm:text-5xl lg:text-6xl">
          Siapkan rapor dan akta, pendaftaran siap dimulai.
        </h2>
        <p className="mt-5 max-w-xl text-lg text-kertas/85">
          Sudah mendaftar? Masukkan nomor pendaftaran dan tanggal lahir untuk melihat status verifikasi.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/daftar/langkah/1">
            <Button varian="aksen" ukuran="lg" className="w-full sm:w-auto">
              Daftar Sekarang
            </Button>
          </Link>
          <Link href="/cek-status">
            <Button varian="terang" ukuran="lg" className="w-full sm:w-auto">
              Cek Status
            </Button>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
