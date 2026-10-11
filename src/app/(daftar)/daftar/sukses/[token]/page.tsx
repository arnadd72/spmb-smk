import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { AksiSukses } from "@/features/wizard/aksi-sukses";
import { formatTanggal } from "@/lib/format";
import { ambilRingkasanSukses } from "@/server/services/pendaftaran";

export const metadata = { title: "Pendaftaran berhasil", robots: { index: false, follow: false } };

export default async function HalamanSukses({ params }: PageProps<"/daftar/sukses/[token]">) {
  const { token } = await params;
  const r = await ambilRingkasanSukses(token);
  if (!r) notFound();

  return (
    <div className="px-4 py-10 sm:py-14">
      <p className="flex items-center gap-2 font-semibold text-sukses">
        <CheckCircleIcon aria-hidden weight="fill" className="size-6" />
        Pendaftaran berhasil dikirim
      </p>
      <h1 className="mt-3 font-display text-[clamp(1.75rem,6vw,2.5rem)] font-semibold leading-tight text-ink">Nomor pendaftaran Anda</h1>

      <p className="angka mt-4 break-all rounded-kartu bg-primer px-5 py-6 text-center font-display text-[clamp(1.75rem,8vw,3rem)] font-bold text-primer-tinta" data-nomor>
        {r.nomor}
      </p>
      <AksiSukses nomor={r.nomor} />

      <p className="mt-6 rounded-kontrol bg-peringatan-latar px-3 py-2.5 text-sm font-medium text-peringatan">
        Simpan nomor pendaftaran dan tautan halaman ini. Nomor dipakai untuk cek status bersama tanggal lahir.
      </p>

      <dl className="mt-8 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Baris judul="Nama" nilai={r.nama} />
        <Baris judul="NISN" nilai={r.nisn ?? "-"} />
        <Baris judul="Tahun ajaran" nilai={r.periode} />
        <Baris judul="Dikirim pada" nilai={formatTanggal(r.dikirimPada)} />
        <Baris judul="Pilihan jurusan 1" nilai={r.jurusan1 ? `${r.jurusan1.kode} · ${r.jurusan1.nama}` : "-"} />
        <Baris judul="Pilihan jurusan 2" nilai={r.jurusan2 ? `${r.jurusan2.kode} · ${r.jurusan2.nama}` : "-"} />
        <Baris judul="Saran jurusan dari nilai rapor" nilai={r.rekomendasi ? `${r.rekomendasi.kode} · ${r.rekomendasi.nama}` : "-"} />
      </dl>

      <section aria-labelledby="langkah-lanjut" className="mt-10 border-t border-garis pt-6">
        <h2 id="langkah-lanjut" className="text-lg font-bold text-ink">
          Selanjutnya
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-tinta">
          <li>Panitia memverifikasi data dan berkas Anda.</li>
          <li>Bawa berkas asli (akta, kartu keluarga, rapor) saat verifikasi berkas fisik di sekolah.</li>
          <li>Pantau hasilnya lewat halaman Cek Status.</li>
        </ol>
        <Link
          href="/cek-status"
          className="mt-5 inline-flex min-h-11 items-center rounded-kontrol border border-primer px-4 text-sm font-semibold text-primer-tua hover:bg-permukaan-alt print:hidden"
        >
          Buka Cek Status
        </Link>
      </section>
    </div>
  );
}

function Baris({ judul, nilai }: { judul: string; nilai: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-tinta-redup">{judul}</dt>
      <dd className="break-words font-semibold text-tinta">{nilai}</dd>
    </div>
  );
}
