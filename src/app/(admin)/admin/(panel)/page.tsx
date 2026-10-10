import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Dashboard" };

// Penampung A0. Dashboard sesungguhnya dikerjakan di A6 (PRD v4 20.1).
export default function DashboardSementara() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-extrabold text-primer-tua">Dashboard</h1>
      <div className="mt-6">
        <EmptyState
          judul="Dashboard belum dibuat"
          deskripsi="Statistik pendaftar dan verifikasi dikerjakan pada milestone A6."
        />
      </div>
    </div>
  );
}
