import { FormCekStatus } from "@/features/wizard/form-cek-status";

export const metadata = {
  title: "Cek status pendaftaran",
  description: "Pantau status pendaftaran SPMB SMK Ma'arif NU 1 Wangon dengan nomor pendaftaran dan tanggal lahir.",
};

export default function HalamanCekStatus() {
  return (
    <div className="wadah py-12 lg:py-20">
      <h1 className="max-w-[16ch] text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1] tracking-[-0.02em] text-ink">
        Cek status pendaftaran
      </h1>
      <p className="mt-4 max-w-[52ch] text-tinta-redup">
        Masukkan nomor pendaftaran dan tanggal lahir peserta untuk melihat perkembangan verifikasi.
      </p>
      <div className="mt-10 max-w-xl">
        <FormCekStatus />
      </div>
    </div>
  );
}
