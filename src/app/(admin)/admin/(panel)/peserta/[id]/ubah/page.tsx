import Link from "next/link";
import { notFound } from "next/navigation";
import { FormUbahPeserta } from "@/features/admin/peserta/form-ubah";
import { ambilPeserta, fieldEdit } from "@/server/actions/peserta";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";
import { muatDefinisiField } from "@/server/services/draf";
import { GalatApi } from "@/server/types/galat";

export const metadata = { title: "Ubah data pendaftar" };

export default async function UbahPendaftar({ params }: PageProps<"/admin/peserta/[id]/ubah">) {
  await wajibPeranHalaman(...PERAN.pendaftar);
  const { id } = await params;
  let p;
  try {
    p = await ambilPeserta(id);
  } catch (e) {
    if (e instanceof GalatApi && e.status === 404) notFound();
    throw e;
  }
  const fields = fieldEdit(await muatDefinisiField());

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm">
        <Link href={`/admin/peserta/${p.id}`} className="font-semibold text-primer-tua underline underline-offset-4">
          {p.nomor}
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-bold text-ink">Ubah data pendaftar</h1>
      <p className="mt-1 text-tinta-redup">
        Perubahan dicatat di riwayat beserta data lama dan barunya. Berkas dan nilai rapor diubah lewat halaman verifikasi.
      </p>
      <div className="mt-6">
        <FormUbahPeserta id={p.id} fields={fields} nilai={p.nilai} />
      </div>
    </div>
  );
}
