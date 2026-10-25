import { CheckCircleIcon, FloppyDiskIcon, IdentificationCardIcon, PencilSimpleLineIcon } from "@phosphor-icons/react/dist/ssr";
import { FormAksesEdit } from "@/features/wizard/form-akses-edit";

export const metadata = {
  title: "Edit formulir",
  description: "Masuk dengan nomor pendaftaran dan tanggal lahir untuk mengedit data formulir SPMB.",
};

const CARA = [
  { Ikon: IdentificationCardIcon, judul: "Masukkan nomor dan tanggal lahir", isi: "Nomor pendaftaran ada di email dan formulir PDF Anda." },
  { Ikon: PencilSimpleLineIcon, judul: "Ubah data yang keliru", isi: "Isian formulir, foto akta, KK, dan pas foto bisa diperbaiki." },
  { Ikon: FloppyDiskIcon, judul: "Simpan perubahan", isi: "Data terbaru langsung dipakai panitia." },
];

export default async function HalamanEditFormulir({
  searchParams,
}: {
  searchParams: Promise<{ berhasil?: string }>;
}) {
  const { berhasil } = await searchParams;
  return (
    <div className="wadah grid max-w-6xl items-start gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16 lg:py-20">
      <div>
        <h1 className="max-w-[16ch] text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
          Edit formulir
        </h1>
        <p className="mt-4 max-w-[52ch] text-lg text-tinta-redup">
          Salah ketik atau data berubah setelah mendaftar? Perbaiki sendiri di sini, tanpa perlu datang ke sekolah.
        </p>
        <ol className="mt-8 flex flex-col gap-4">
          {CARA.map(({ Ikon, judul, isi }, i) => (
            <li key={judul} className="flex items-start gap-4">
              <span className="relative grid size-11 shrink-0 place-items-center rounded-kontrol bg-mint/60 text-primer-tua">
                <Ikon aria-hidden className="size-5" />
                <span className="angka absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-primer text-[0.6875rem] font-bold text-primer-tinta">
                  {i + 1}
                </span>
              </span>
              <span>
                <span className="block font-semibold text-ink">{judul}</span>
                <span className="mt-0.5 block text-sm text-tinta-redup">{isi}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-kartu border border-garis bg-permukaan p-6 shadow-kartu sm:p-8">
        {berhasil === "1" && (
          <p role="status" className="mb-6 flex items-start gap-3 rounded-kontrol bg-sukses-latar p-3 font-semibold text-sukses">
            <CheckCircleIcon aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0" />
            Formulir berhasil diperbarui.
          </p>
        )}
        <h2 className="text-lg font-bold text-ink">Buka formulir Anda</h2>
        <p className="mb-6 mt-1 text-sm text-tinta-redup">Masukkan data yang sama dengan saat mendaftar.</p>
        <FormAksesEdit />
      </div>
    </div>
  );
}
