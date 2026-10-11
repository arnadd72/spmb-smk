import Link from "next/link";
import { redirect } from "next/navigation";
import { FormGantiPassword } from "@/features/admin/auth/form-ganti-password";
import { ambilSesiAdmin } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Ganti password" };

// Ganti password bersifat sukarela, dibuka dari menu admin.
export default async function HalamanGantiPassword() {
  const sesi = await ambilSesiAdmin();
  if (!sesi) redirect("/admin/login");

  return (
    <main id="konten" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <p className="font-display text-lg font-extrabold text-primer-tua">SMK Ma&apos;arif NU 1 Wangon</p>
      <h1 className="mt-2 text-3xl font-extrabold text-tinta">Ganti password</h1>
      <p className="mt-2 text-tinta-redup">
        Gunakan password yang unik dan tidak dipakai di layanan lain.
      </p>
      <div className="mt-8 rounded-kartu border border-garis bg-permukaan p-6 shadow-kartu">
        <FormGantiPassword />
      </div>
      <Link href="/admin" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primer-tua underline underline-offset-4">
        Kembali ke dashboard
      </Link>
    </main>
  );
}
