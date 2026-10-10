import { Stepper } from "@/components/ui/stepper";
import { EmptyState } from "@/components/ui/empty-state";

// Penampung sementara. Isi langkah wizard dikerjakan di M4 (PRD 10.4).
export default async function Langkah({ params }: PageProps<"/daftar/langkah/[n]">) {
  const { n } = await params;
  const nomor = Math.min(Math.max(Number(n) || 1, 1), 8);

  return (
    <>
      <Stepper langkah={nomor} total={8} nama="Segera hadir" menempel />
      <div className="p-4">
        <EmptyState judul="Langkah ini belum dibuat" deskripsi="Wizard pendaftaran dikerjakan pada milestone M4." />
      </div>
    </>
  );
}
