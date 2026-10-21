import { Footer } from "@/components/layout/footer";
import { TanyaPanitia } from "@/features/tanya/tanya-panitia";
import { Navbar } from "@/components/layout/navbar";
import { Pembuka } from "@/features/landing/pembuka";
import { SmoothScroll } from "@/features/landing/smooth-scroll";
import { ambilAsetPublik } from "@/server/services/asetSitus";

export default async function LayoutPublik({ children }: LayoutProps<"/">) {
  // Logo bisa diganti admin dari halaman Galeri; layout disegarkan lewat revalidatePath saat admin menyimpan.
  const { logo } = await ambilAsetPublik();
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-kontrol focus:bg-permukaan focus:px-4 focus:py-2"
      >
        Lewati ke konten
      </a>
      <Pembuka logo={logo} />
      <SmoothScroll />
      <Navbar logo={logo} />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <Footer />
      <TanyaPanitia />
    </div>
  );
}
