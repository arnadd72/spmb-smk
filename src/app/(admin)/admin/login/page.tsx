import { redirect } from "next/navigation";
import { FormLogin } from "@/features/admin/auth/form-login";
import { ambilSesiAdmin } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Masuk panitia" };

export default async function HalamanLogin() {
  if (await ambilSesiAdmin()) redirect("/admin");

  return (
    <main id="konten" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <p className="font-display text-lg font-extrabold text-primer-tua">SMK Ma&apos;arif NU 1 Wangon</p>
      <h1 className="mt-2 text-4xl font-extrabold text-tinta">Masuk panitia SPMB</h1>
      <p className="mt-2 text-tinta-redup">Khusus petugas panitia dan operator konten.</p>
      <div className="mt-8 rounded-kartu border border-garis bg-permukaan p-6 shadow-kartu">
        <FormLogin />
      </div>
    </main>
  );
}
