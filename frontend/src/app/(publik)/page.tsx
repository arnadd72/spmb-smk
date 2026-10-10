import Link from "next/link";
import { Button } from "@/components/ui/button";

// Penampung sementara. Landing sesungguhnya dikerjakan di M3 (PRD 10.2, 16.3).
export default function Beranda() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
      <h1 className="max-w-3xl text-4xl font-extrabold text-primer-tua sm:text-5xl lg:text-6xl">
        Portal SPMB SMK Ma&apos;arif NU 1 Wangon
      </h1>
      <p className="mt-5 max-w-xl text-lg text-tinta-redup">
        Pendaftaran murid baru tanpa akun. Unggah dokumen, isi data, dan terima nomor pendaftaran.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/daftar/langkah/1">
          <Button varian="aksen" ukuran="lg" penuhMobile>
            Daftar Sekarang
          </Button>
        </Link>
        <Link href="/cek-status">
          <Button varian="sekunder" ukuran="lg" penuhMobile>
            Cek Status
          </Button>
        </Link>
      </div>
    </section>
  );
}
