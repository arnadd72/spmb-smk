import { AlurDaftar } from "@/features/landing/alur-daftar";
import { FaqLanding } from "@/features/landing/faq-landing";
import { Hero } from "@/features/landing/hero";
import { JadwalGelombang } from "@/features/landing/jadwal-gelombang";
import { KabarTerbaru } from "@/features/landing/kabar-terbaru";
import { KehidupanSekolah } from "@/features/landing/kehidupan-sekolah";
import { MarqueeJurusan } from "@/features/landing/marquee-jurusan";
import { Pernyataan } from "@/features/landing/pernyataan";
import { Penutup } from "@/features/landing/penutup";
import { ProgramKeahlian } from "@/features/landing/program-keahlian";
import { TesMinat } from "@/features/landing/tes-minat";
import { TestimoniLanding } from "@/features/landing/testimoni-landing";
import { ambilDataLanding } from "@/server/actions/ambilLanding";

// Landing dirender server dan disegarkan tiap 5 menit (PRD v3.1 10.2). Revalidasi on-demand saat
// admin menyimpan konten ditambahkan di A3 (revalidatePath).
export const revalidate = 300;

export const metadata = {
  title: { absolute: "SPMB SMK Ma'arif NU 1 Wangon | Pendaftaran Murid Baru SPMB" },
  description:
    "Pendaftaran murid baru SMK Ma'arif NU 1 Wangon, Banyumas: AKL, MPLB, LPK3, dan TKR. Daftar tanpa akun, ikuti tes minat bakat, dapatkan saran jurusan.",
};

export default async function Beranda() {
  const data = await ambilDataLanding();

  return (
    <>
      <Hero tahunAjaran={data.tahunAjaran} foto={data.aset.hero} fotoAlt={data.aset.heroAlt} logo={data.aset.logo} fotoTambahan={data.heroTambahan} />
      <Pernyataan />
      <MarqueeJurusan />
      <ProgramKeahlian jurusan={data.jurusan} />
      <AlurDaftar />
      <JadwalGelombang gelombang={data.gelombang} />
      <KehidupanSekolah galeri={data.galeri} />
      <KabarTerbaru berita={data.berita} agenda={data.agenda} />
      <TesMinat />
      <TestimoniLanding testimoni={data.testimoni} />
      <FaqLanding faq={data.faq} />
      <Penutup logo={data.aset.logo} />
    </>
  );
}
