import { AlurDaftar } from "@/features/landing/alur-daftar";
import { FaqLanding } from "@/features/landing/faq-landing";
import { Hero } from "@/features/landing/hero";
import { KehidupanSekolah } from "@/features/landing/kehidupan-sekolah";
import { MarqueeJurusan } from "@/features/landing/marquee-jurusan";
import { Pernyataan } from "@/features/landing/pernyataan";
import { Penutup } from "@/features/landing/penutup";
import { ProgramKeahlian } from "@/features/landing/program-keahlian";
import { SaranJurusan } from "@/features/landing/saran-jurusan";
import { ambilDataLanding } from "@/server/actions/ambilLanding";

// Landing dirender server dan disegarkan tiap 5 menit (PRD v3.1 10.2). Revalidasi on-demand saat
// admin menyimpan konten ditambahkan di A3 (revalidatePath).
export const revalidate = 300;

export const metadata = {
  title: { absolute: "SPMB SMK Ma'arif NU 1 Wangon | Penerimaan Murid Baru" },
  description:
    "Pendaftaran murid baru SMK Ma'arif NU 1 Wangon, Banyumas: AKL, MPLB, FKK, dan TKR. Daftar tanpa akun, unggah rapor, dapatkan saran jurusan.",
};

export default async function Beranda() {
  const data = await ambilDataLanding();

  return (
    <>
      <Hero tahunAjaran={data.tahunAjaran} />
      <Pernyataan />
      <MarqueeJurusan />
      <ProgramKeahlian jurusan={data.jurusan} />
      <AlurDaftar />
      <KehidupanSekolah />
      <SaranJurusan />
      <FaqLanding faq={data.faq} />
      <Penutup />
    </>
  );
}
