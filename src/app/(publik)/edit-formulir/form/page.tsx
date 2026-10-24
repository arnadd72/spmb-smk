import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FormEditPublik } from "@/features/wizard/form-edit-publik";
import { ambilFormEditPublik, bacaTokenEditFormulir, NAMA_COOKIE_EDIT } from "@/server/services/editFormulir";

export const metadata = { title: "Edit formulir", robots: { index: false } };

export default async function HalamanFormEditPublik() {
  const token = (await cookies()).get(NAMA_COOKIE_EDIT)?.value;
  const id = await bacaTokenEditFormulir(token);
  if (!id) redirect("/edit-formulir");
  const data = await ambilFormEditPublik(id);
  return (
    <div className="wadah max-w-5xl py-10 lg:py-16">
      <p className="text-sm font-semibold text-tinta-redup">Nomor pendaftaran: {data.nomor}</p>
      <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3rem)] font-semibold leading-tight text-ink">
        Edit formulir
      </h1>
      <p className="mb-8 mt-3 text-tinta-redup">Perbarui data formulir, lalu simpan perubahan.</p>
      {data.catatan && <p className="mb-6 rounded-kontrol bg-peringatan-latar p-4 text-sm text-peringatan"><span className="font-semibold">Catatan panitia: </span>{data.catatan}</p>}
      <FormEditPublik fields={data.fields} nilaiAwal={data.nilai} />
    </div>
  );
}
