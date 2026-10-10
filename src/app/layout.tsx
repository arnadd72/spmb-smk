import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";

// Dua keluarga font, di-host sendiri (Fontshare, lisensi gratis untuk komersial). Keputusan pemilik
// proyek 11 Okt 2026: mengganti Bricolage Grotesque + Plus Jakarta Sans (lihat PRD 1.3).
const clash = localFont({
  variable: "--font-clash",
  display: "swap",
  src: [
    { path: "./fonts/ClashDisplay-500.woff2", weight: "500" },
    { path: "./fonts/ClashDisplay-600.woff2", weight: "600" },
    { path: "./fonts/ClashDisplay-700.woff2", weight: "700" },
  ],
});

const satoshi = localFont({
  variable: "--font-satoshi",
  display: "swap",
  src: [
    { path: "./fonts/Satoshi-400.woff2", weight: "400" },
    { path: "./fonts/Satoshi-500.woff2", weight: "500" },
    { path: "./fonts/Satoshi-700.woff2", weight: "700" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "SPMB SMK Ma'arif NU 1 Wangon",
    template: "%s | SPMB SMK Ma'arif NU 1 Wangon",
  },
  description:
    "Portal Sistem Penerimaan Murid Baru SMK Ma'arif NU 1 Wangon, Banyumas, Jawa Tengah.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#057a3c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${clash.variable} ${satoshi.variable}`}>
      <body>{children}</body>
    </html>
  );
}
