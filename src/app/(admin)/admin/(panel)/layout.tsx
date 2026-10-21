import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { ambilSesiAdmin } from "@/server/auth/verifikasiSesi";
import { ambilAsetPublik } from "@/server/services/asetSitus";

// Pengecekan sesi di sini adalah lapisan otoritatif untuk halaman; proxy.ts hanya pengecekan awal.
export default async function LayoutPanel({ children }: LayoutProps<"/admin">) {
  const sesi = await ambilSesiAdmin();
  if (!sesi) redirect("/admin/login");
  const { logo } = await ambilAsetPublik();

  return (
    <AdminShell nama={sesi.nama} peran={sesi.peran} logo={logo}>
      {children}
    </AdminShell>
  );
}
