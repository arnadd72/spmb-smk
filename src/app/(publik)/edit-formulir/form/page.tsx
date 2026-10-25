import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NotePencilIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { FormEditPublik } from "@/features/wizard/form-edit-publik";
import { ambilFormEditPublik, bacaTokenEditFormulir, NAMA_COOKIE_EDIT } from "@/server/services/editFormulir";

export const metadata = { title: "Edit formulir", robots: { index: false } };

export default async function HalamanFormEditPublik() {
  const token = (await cookies()).get(NAMA_COOKIE_EDIT)?.value;
  const id = await bacaTokenEditFormulir(token);
  if (!id) redirect("/edit-formulir");
  const data = await ambilFormEditPublik(id);
  const nama = typeof data.nilai.nama_lengkap === "string" ? data.nilai.nama_lengkap : "";
  return (
    <div className="wadah max-w-6xl py-10 lg:py-16">
      <div className="flex flex-col gap-5 rounded-kartu bg-mint p-6 text-ink sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <NotePencilIcon aria-hidden className="size-5" />
            Edit formulir pendaftaran
          </p>
          <h1 className="mt-2 break-words font-display text-[clamp(1.75rem,4.5vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.015em]">
            {nama || "Edit formulir"}
          </h1>
          <p className="mt-2 max-w-[52ch] text-ink/80">Perbarui data yang keliru atau berubah, lalu tekan Simpan perubahan.</p>
        </div>
        <div className="shrink-0 rounded-kartu bg-permukaan px-4 py-3 sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-tinta-redup">Nomor pendaftaran</p>
          <p className="angka mt-0.5 text-lg font-bold">{data.nomor}</p>
        </div>
      </div>

      {data.catatan && (
        <div role="note" className="mt-6 flex items-start gap-3 rounded-kartu border border-peringatan/30 bg-peringatan-latar p-4 text-peringatan">
          <WarningCircleIcon aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0" />
          <p>
            <span className="block font-semibold">Catatan dari panitia</span>
            <span className="text-sm">{data.catatan}</span>
          </p>
        </div>
      )}

      <div className="mt-8">
        <FormEditPublik fields={data.fields} nilaiAwal={data.nilai} berkas={data.berkas.map(({ kunci, nama, mime, ukuran }) => ({ kunci, nama, mime, ukuran }))} />
      </div>
    </div>
  );
}
