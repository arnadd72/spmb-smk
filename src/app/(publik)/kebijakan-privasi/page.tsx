export const metadata = {
  title: "Kebijakan privasi",
  description: "Cara SPMB SMK Ma'arif NU 1 Wangon mengumpulkan, memakai, dan melindungi data pendaftar.",
};

const BAGIAN: { judul: string; isi: string[] }[] = [
  {
    judul: "Data yang kami kumpulkan",
    isi: [
      "Data diri murid: nama, tempat dan tanggal lahir, NISN, NIK, nomor Kartu Keluarga, alamat, nomor HP atau WhatsApp, email, dan data sekolah asal.",
      "Data orang tua: nama, NIK, tempat dan tanggal lahir, pendidikan, pekerjaan, penghasilan, dan alamat.",
      "Dokumen yang Anda unggah secara sukarela: akta kelahiran, kartu keluarga, dan pas foto. Bila Anda mengerjakan tes minat bakat saat mendaftar, jawabannya dipakai untuk saran jurusan.",
    ],
  },
  {
    judul: "Untuk apa data dipakai",
    isi: [
      "Data dipakai panitia SPMB SMK Ma'arif NU 1 Wangon untuk seleksi, verifikasi, penempatan jurusan, pembuatan formulir pendaftaran, dan komunikasi dengan pendaftar. Data tidak dijual dan tidak dipakai untuk iklan.",
    ],
  },
  {
    judul: "Bagaimana data dilindungi",
    isi: [
      "Data sensitif (NIK, nomor Kartu Keluarga, dan nomor HP) dienkripsi sebelum disimpan. Dokumen disimpan di penyimpanan Google Drive milik sekolah dan tidak memiliki alamat publik; hanya panitia yang berwenang yang dapat membukanya, dan setiap pembukaan dicatat.",
      "Pendaftaran tidak memerlukan akun. Draf yang belum dikirim disimpan terenkripsi dan dihapus otomatis bila tidak dilanjutkan.",
    ],
  },
  {
    judul: "Siapa yang dapat mengakses data",
    isi: [
      "Hanya panitia SPMB yang memiliki akun resmi. Data dapat dibagikan kepada pihak lain hanya bila diwajibkan oleh peraturan, atau dengan persetujuan orang tua atau wali.",
    ],
  },
  {
    judul: "Layanan pihak ketiga",
    isi: [
      "Kami memakai layanan penyimpanan dan basis data (Supabase), penyimpanan dokumen (Google Drive), pengiriman email (Resend), dan hosting (Vercel). Pembacaan teks dari foto akta dan kartu keluarga berjalan di peramban Anda sendiri; foto tidak dikirim ke layanan pengenal teks.",
    ],
  },
  {
    judul: "Hak Anda",
    isi: [
      "Orang tua atau wali dapat meminta panitia untuk memperbaiki data yang keliru atau menghapus data pendaftaran. Hubungi panitia SPMB lewat kontak sekolah di bagian bawah halaman.",
    ],
  },
];

export default function HalamanKebijakanPrivasi() {
  return (
    <div className="wadah py-12 lg:py-20">
      <h1 className="max-w-[18ch] text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1] tracking-[-0.02em] text-ink">Kebijakan privasi</h1>
      <p className="mt-4 max-w-[60ch] text-tinta-redup">
        Halaman ini menjelaskan bagaimana SPMB SMK Ma&apos;arif NU 1 Wangon mengelola data pribadi pendaftar dan orang tua.
      </p>
      <div className="mt-10 flex max-w-[68ch] flex-col gap-8">
        {BAGIAN.map((b, i) => (
          <section key={b.judul} aria-labelledby={`privasi-${i}`}>
            <h2 id={`privasi-${i}`} className="text-xl font-bold text-ink">
              {b.judul}
            </h2>
            {b.isi.map((t) => (
              <p key={t} className="mt-2 text-tinta">
                {t}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
