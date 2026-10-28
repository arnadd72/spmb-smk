import type { PeranAdmin } from "@/server/auth/sesi";

// Matriks hak akses (PRD v3.1 Bagian 5). Dipakai di setiap route handler admin lewat wajibSesiAdmin(...PERAN.x).
export const PERAN = {
  /** Data pendaftar, verifikasi, kuota, ekspor, input manual. */
  pendaftar: ["panitia", "superadmin"] as PeranAdmin[],
  /** Berita, agenda, galeri, testimoni, FAQ. */
  konten: ["konten", "superadmin"] as PeranAdmin[],
  /** Jurusan, mapel, bobot, form builder, pengaturan, akun admin, audit log. */
  sistem: ["superadmin"] as PeranAdmin[],
  /** Boleh melihat data referensi (jurusan, mapel) tanpa mengubah. */
  referensi: ["panitia", "superadmin"] as PeranAdmin[],
};
