import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

export default function LayoutPublik({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-kontrol focus:bg-permukaan focus:px-4 focus:py-2"
      >
        Lewati ke konten
      </a>
      <Navbar />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
