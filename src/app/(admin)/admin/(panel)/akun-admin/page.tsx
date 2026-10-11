import { PanelAkun } from "@/features/admin/akun/panel-akun";
import { daftarAkun } from "@/server/actions/akun";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Akun admin" };

export default async function HalamanAkun() {
  const sesi = await wajibPeranHalaman(...PERAN.sistem);
  const akun = await daftarAkun();
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold text-ink">Akun admin</h1>
      <p className="mt-1 max-w-[66ch] text-tinta-redup">
        Superadmin mengelola seluruh sistem, panitia mengurus pendaftar, operator konten mengelola isi situs. Penonaktifan dan perubahan peran langsung berlaku.
      </p>
      <div className="mt-6">
        <PanelAkun akun={akun} saya={sesi.sub} />
      </div>
    </div>
  );
}
