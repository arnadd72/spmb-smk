import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";

// Dua keluarga font saja (PRD 16.2). next/font self-host saat build, font-display: swap.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
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
    <html lang="id" className={`${bricolage.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
