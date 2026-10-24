import { PanelJurusan } from "@/features/admin/konten/panel-jurusan";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Jurusan" };

export default async function Halaman() {
  await wajibPeranHalaman(...PERAN.sistem);
  // Bobot mata pelajaran dihapus bersama nilai rapor (PRD 1.3 butir 65); alamat halaman tetap agar tautan lama berlaku.
  return <PanelJurusan />;
}
