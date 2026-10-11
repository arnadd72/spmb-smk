import { prisma } from "@/server/db/client";
import { emailKodePendaftaran } from "@/server/email/kodePendaftaran";
import { kirimEmail, type HasilEmail } from "@/server/email/kirim";
import { ambilPengaturan } from "@/server/services/pengaturan";

// Email kode pendaftaran (PRD v4 15.4). Dikirim langsung setelah submit; kegagalan tidak menggagalkan pendaftaran
// dan dicoba ulang oleh cron harian. `notifikasiEmailAt` memastikan email hanya terkirim sekali.

export const situs = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Kirim email kode ke pendaftar bila punya email dan belum pernah dikirimi. `aksesToken` kosong = kirim ulang tanpa tautan bertoken. */
export async function kirimKodePendaftaran(nomor: string, aksesToken?: string): Promise<HasilEmail & { dilewatiKarena?: string }> {
  const p = await prisma.pendaftar.findUnique({ where: { nomorPendaftaran: nomor }, include: { jurusan1: true, jurusan2: true } });
  if (!p) return { status: "gagal", pesan: "Pendaftar tidak ditemukan." };
  if (!p.email) return { status: "dilewati", dilewatiKarena: "tanpa-email" };
  if (p.notifikasiEmailAt) return { status: "dilewati", dilewatiKarena: "sudah-terkirim" };

  const [waGroup, tanggalVerifikasi, kontak] = await Promise.all([
    ambilPengaturan("wa_group_url"),
    ambilPengaturan("tanggal_verifikasi_fisik"),
    ambilPengaturan("kontak_panitia"),
  ]);
  const { subjek, html, teks } = emailKodePendaftaran({
    nomor: p.nomorPendaftaran,
    nama: p.namaLengkap,
    nisn: p.nisn,
    jurusan1: p.jurusan1 ? `${p.jurusan1.kode} · ${p.jurusan1.nama}` : null,
    jurusan2: p.jurusan2 ? `${p.jurusan2.kode} · ${p.jurusan2.nama}` : null,
    periode: p.periode,
    situs: situs(),
    aksesToken,
    waGroup,
    tanggalVerifikasi: tanggalVerifikasi && /^\d{4}-\d{2}-\d{2}$/.test(tanggalVerifikasi)
      ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${tanggalVerifikasi}T00:00:00+07:00`))
      : null,
    kontak,
  });

  const hasil = await kirimEmail({ ke: p.email, subjek, html, teks });
  if (hasil.status === "terkirim") await prisma.pendaftar.update({ where: { id: p.id }, data: { notifikasiEmailAt: new Date() } });
  return hasil;
}

/** Cron: kirim ulang email yang gagal (pendaftar daring dengan email, 14 hari terakhir). Tautan bertoken tidak tersedia lagi. */
export async function kirimUlangEmailTertunda(batas = 50) {
  const tertunda = await prisma.pendaftar.findMany({
    where: { email: { not: null }, notifikasiEmailAt: null, sumber: "daring", createdAt: { gte: new Date(Date.now() - 14 * 86400_000) } },
    orderBy: { createdAt: "asc" },
    take: batas,
    select: { nomorPendaftaran: true },
  });
  let terkirim = 0;
  let gagal = 0;
  let dilewati = 0;
  for (const t of tertunda) {
    const h = await kirimKodePendaftaran(t.nomorPendaftaran);
    if (h.status === "terkirim") terkirim++;
    else if (h.status === "gagal") gagal++;
    else dilewati++;
  }
  return { diproses: tertunda.length, terkirim, gagal, dilewati };
}
