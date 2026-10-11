import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { bacaToken, NAMA_COOKIE_ADMIN, type IsiSesi, type PeranAdmin } from "@/server/auth/sesi";
import { prisma } from "@/server/db/client";
import { GalatApi } from "@/server/types/galat";

/**
 * Sesi admin dari cookie, atau null bila tidak ada, tidak sah, atau akunnya sudah dinonaktifkan atau dihapus.
 * Peran dan nama dibaca dari database setiap kali (satu query per kunci utama),
 * sehingga perubahan peran dan penonaktifan oleh superadmin langsung berlaku tanpa menunggu token habis.
 */
export async function ambilSesiAdmin(): Promise<IsiSesi | null> {
  const jar = await cookies();
  const sesi = await bacaToken(jar.get(NAMA_COOKIE_ADMIN)?.value);
  if (!sesi || !/^\d{1,18}$/.test(sesi.sub)) return null;

  const user = await prisma.user.findUnique({
    where: { id: BigInt(sesi.sub) },
    select: { isActive: true, peran: true, name: true },
  });
  if (!user || !user.isActive) return null;
  return { sub: sesi.sub, peran: user.peran, nama: user.name };
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

/**
 * Untuk halaman (Server Component) admin: belum masuk diarahkan ke login, peran tidak cocok diarahkan
 * ke dashboard. Rute API tetap memakai wajibSesiAdmin yang menjawab 401/403.
 */
export async function wajibPeranHalaman(...peranBoleh: PeranAdmin[]): Promise<IsiSesi> {
  const sesi = await ambilSesiAdmin();
  if (!sesi) redirect("/admin/login");
  if (peranBoleh.length > 0 && !peranBoleh.includes(sesi.peran)) redirect("/admin?akses=ditolak");
  return sesi;
}
