import { FormAksesEdit } from "@/features/wizard/form-akses-edit";

export const metadata = {
  title: "Edit formulir",
  description: "Masuk dengan nomor pendaftaran dan tanggal lahir untuk mengedit data formulir SPMB.",
};

export default async function HalamanEditFormulir({
  searchParams,
}: {
  searchParams: Promise<{ berhasil?: string }>;
}) {
  const { berhasil } = await searchParams;
  return (
    <div className="wadah max-w-3xl py-12 lg:py-20">
      <h1 className="max-w-[16ch] text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1] tracking-[-0.02em] text-ink">
        Edit formulir
      </h1>
      <p className="mt-4 max-w-[52ch] text-tinta-redup">
        Masukkan nomor pendaftaran dan tanggal lahir peserta untuk membuka formulir yang sudah dikirim.
      </p>
      {berhasil === "1" && (
        <p role="status" className="mt-5 rounded-kontrol border border-sukses/30 bg-sukses/10 p-3 font-semibold text-sukses">
          Formulir berhasil diperbarui.
        </p>
      )}
      <div className="mt-10 max-w-xl">
        <FormAksesEdit />
      </div>
    </div>
  );
}
