import { cookies } from "next/headers";
import { CheckCircleIcon, ClockIcon } from "@phosphor-icons/react/dist/ssr";
import { TombolMulaiDaftar } from "@/features/wizard/mulai-daftar";
import { formatTanggal } from "@/lib/format";
import { NAMA_COOKIE_DRAF, ambilDraf, ambilKonfigWizard } from "@/server/services/draf";

export const metadata = {
  title: "Daftar SPMB",
  description: "Mulai pendaftaran peserta didik baru SMK Ma'arif NU 1 Wangon.",
};

const SIAPKAN = [
  "Akta kelahiran dan kartu keluarga (foto atau pindaian, opsional namun disarankan)",
  "Nilai rapor SMP/MTs (opsional; untuk mendapat saran jurusan)",
  "NISN dan NIK, nomor HP atau WhatsApp yang aktif",
  "Data orang tua: nama, pekerjaan, penghasilan, dan alamat",
];

export default async function HalamanDaftar() {
  const konfig = await ambilKonfigWizard();
  const draf = await ambilDraf((await cookies()).get(NAMA_COOKIE_DRAF)?.value);
  const lanjut = Boolean(draf && !draf.sudahKirim);

  return (
    <div className="px-4 py-10 sm:py-14">
      <h1 className="max-w-[18ch] font-display text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.02] text-ink">
        Sistem penerimaan murid baru
      </h1>
      <p className="mt-3 text-tinta-redup">Tahun ajaran {konfig.tahunAjaran}. Sekitar 10 sampai 15 menit, tanpa membuat akun.</p>

      {konfig.status !== "buka" ? (
        <p role="status" className="mt-8 flex items-start gap-3 rounded-kartu bg-peringatan-latar p-4 font-medium text-peringatan">
          <ClockIcon aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0" />
          {konfig.status === "belum" && konfig.buka
            ? `${konfig.keadaan.adaGelombang && konfig.keadaan.saatIni ? konfig.keadaan.saatIni.nama : "Pendaftaran"} dibuka pada ${formatTanggal(konfig.buka)}. Silakan kembali pada tanggal tersebut.`
            : konfig.keadaan.alasanTutup === "penuh" && konfig.keadaan.saatIni
              ? `Kuota ${konfig.keadaan.saatIni.nama} sudah penuh.${konfig.keadaan.berikut ? ` ${konfig.keadaan.berikut.nama} dibuka pada ${formatTanggal(konfig.keadaan.berikut.buka)}.` : ""}`
              : "Pendaftaran sudah ditutup."}
          {konfig.kontak ? ` Hubungi panitia: ${konfig.kontak}` : ""}
        </p>
      ) : (
        <>
          <section aria-labelledby="siapkan" className="mt-8">
            <h2 id="siapkan" className="text-lg font-bold text-ink">
              Siapkan ini dulu
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {SIAPKAN.map((s) => (
                <li key={s} className="flex items-start gap-3">
                  <CheckCircleIcon aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0 text-primer" />
                  <span className="text-tinta">{s}</span>
                </li>
              ))}
            </ul>
            {konfig.persyaratan && (
              <div className="mt-5 rounded-kartu bg-permukaan-alt p-4">
                <h3 className="font-bold text-ink">Persyaratan</h3>
                {konfig.persyaratan.split(/\n+/).map((baris, i) => (
                  <p key={i} className="mt-1.5 text-sm text-tinta">
                    {baris}
                  </p>
                ))}
              </div>
            )}
            {konfig.keadaan.adaGelombang && konfig.keadaan.saatIni && konfig.status === "buka" && (
              <p className="mt-2 text-sm font-semibold text-primer-tua">
                {konfig.keadaan.saatIni.nama}
                {konfig.keadaan.saatIni.sisa !== null ? `, sisa ${konfig.keadaan.saatIni.sisa} kursi` : ""}.
              </p>
            )}
            {konfig.tutup && (
              <p className="mt-4 text-sm text-tinta-redup">
                Pendaftaran ditutup <span className="angka">{formatTanggal(konfig.tutup)}</span>.
              </p>
            )}
          </section>

          <div className="mt-8 max-w-sm">
            <TombolMulaiDaftar lanjut={lanjut} />
            {lanjut && <p className="mt-2 text-sm text-tinta-redup">Draf Anda tersimpan di perangkat ini selama 7 hari.</p>}
          </div>
        </>
      )}
    </div>
  );
}
