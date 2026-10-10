import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Dashboard" };

const PESAN: Record<string, { nada: "sukses" | "bahaya"; teks: string }> = {
  "drive=terhubung": { nada: "sukses", teks: "Google Drive berhasil dihubungkan." },
  "drive=ditolak": { nada: "bahaya", teks: "Izin Google Drive ditolak. Hubungkan ulang dari menu Pengaturan." },
  "akses=ditolak": { nada: "bahaya", teks: "Peran Anda tidak memiliki akses ke halaman itu." },
};

// Penampung A0. Dashboard sesungguhnya dikerjakan di A6 (PRD v4 20.1).
export default async function DashboardSementara({ searchParams }: PageProps<"/admin">) {
  const p = await searchParams;
  const kunci = Object.entries(p)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v[0] : v}`)
    .find((x) => x in PESAN);
  const pesan = kunci ? PESAN[kunci] : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold text-ink">Dashboard</h1>
      {pesan && (
        <p
          role="status"
          className={`mt-4 rounded-kontrol px-4 py-3 font-semibold ${pesan.nada === "sukses" ? "bg-sukses-latar text-sukses" : "bg-bahaya-latar text-bahaya"}`}
        >
          {pesan.teks}
        </p>
      )}
      <div className="mt-6">
        <EmptyState judul="Dashboard belum dibuat" deskripsi="Statistik pendaftar dan verifikasi dikerjakan pada milestone A6." />
      </div>
    </div>
  );
}
