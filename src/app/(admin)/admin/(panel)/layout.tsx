import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { ambilSesiAdmin } from "@/server/auth/verifikasiSesi";

// Pengecekan sesi di sini adalah lapisan otoritatif untuk halaman; proxy.ts hanya pengecekan awal.
export default async function LayoutPanel({ children }: LayoutProps<"/admin">) {
  const sesi = await ambilSesiAdmin();
  if (!sesi) redirect("/admin/login");

  return (
    <AdminShell nama={sesi.nama} peran={sesi.peran}>
      {children}
    </AdminShell>
  );
}
