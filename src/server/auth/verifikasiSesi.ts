import { cookies } from "next/headers";
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
  if (peranBoleh.length > 0 && !peranBoleh.includes(sesi.peran)) throw GalatApi.dilarang();
  return sesi;
}
