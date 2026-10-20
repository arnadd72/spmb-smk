import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "@/styles/globals.css";

// Satu keluarga font Poppins untuk judul dan isi (PRD 1.3 butir 38), menggantikan Clash Display + Satoshi.
// Berkas Clash/Satoshi di ./fonts tidak dipakai lagi.
// next/font/google meng-host sendiri berkas font saat build: browser tidak menghubungi Google.
const poppins = Poppins({
  variable: "--font-poppins",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "SPMB SMK Ma'arif NU 1 Wangon",
    template: "%s | SPMB SMK Ma'arif NU 1 Wangon",
  },
  description:
    "Portal Pendaftaran Murid Baru SPMB SMK Ma'arif NU 1 Wangon, Banyumas, Jawa Tengah.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#057a3c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
