import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { bacaToken, NAMA_COOKIE_ADMIN, type IsiSesi, type PeranAdmin } from "@/server/auth/sesi";
import { GalatApi } from "@/server/types/galat";

/** Sesi admin dari cookie, atau null bila tidak ada atau tidak sah. */
export async function ambilSesiAdmin(): Promise<IsiSesi | null> {
  const jar = await cookies();
  return bacaToken(jar.get(NAMA_COOKIE_ADMIN)?.value);
}

/**
 * Dipanggil di awal setiap route handler admin. Tanpa sesi: 401. Peran tidak termasuk: 403.
 * Tanpa daftar peran: cukup terautentikasi.
 */
export async function wajibSesiAdmin(...peranBoleh: PeranAdmin[]): Promise<IsiSesi> {
  const sesi = await ambilSesiAdmin();
  if (!sesi) throw GalatApi.tidakTerautentikasi();
  if (sesi.mcp) throw new GalatApi(403, "PASSWORD_CHANGE_REQUIRED", "Anda wajib mengganti password terlebih dahulu.");
  if (peranBoleh.length > 0 && !peranBoleh.includes(sesi.peran)) throw GalatApi.dilarang();
  return sesi;
}

/**
 * Untuk halaman (Server Component) admin: belum masuk diarahkan ke login, peran tidak cocok diarahkan
 * ke dashboard. Rute API tetap memakai wajibSesiAdmin yang menjawab 401/403.
 */
export async function wajibPeranHalaman(...peranBoleh: PeranAdmin[]): Promise<IsiSesi> {
  const sesi = await ambilSesiAdmin();
  if (!sesi) redirect("/admin/login");
  if (sesi.mcp) redirect("/admin/ganti-password");
  if (peranBoleh.length > 0 && !peranBoleh.includes(sesi.peran)) redirect("/admin?akses=ditolak");
  return sesi;
}
