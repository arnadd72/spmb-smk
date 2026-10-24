import Link from "next/link";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BatangProgres, GrafikPerHari } from "@/features/admin/dashboard/grafik";
import { formatTanggal } from "@/lib/format";
import { ambilDashboard } from "@/server/actions/dashboard";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";

export const metadata = { title: "Dashboard" };

const PESAN: Record<string, { nada: "sukses" | "bahaya"; teks: string }> = {
  "drive=terhubung": { nada: "sukses", teks: "Google Drive berhasil dihubungkan." },
  "drive=ditolak": { nada: "bahaya", teks: "Izin Google Drive ditolak. Hubungkan ulang dari menu Pengaturan." },
  "akses=ditolak": { nada: "bahaya", teks: "Peran Anda tidak memiliki akses ke halaman itu." },
};

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const sesi = await wajibPeranHalaman();
  const p = await searchParams;
  const kunci = Object.entries(p)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? v[0] : v}`)
    .find((x) => x in PESAN);
  const pesan = kunci ? PESAN[kunci] : undefined;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold text-ink">Dashboard</h1>
      {pesan && (
        <p
          role="status"
          className={`mt-4 rounded-kontrol px-4 py-3 font-semibold ${pesan.nada === "sukses" ? "bg-sukses-latar text-sukses" : "bg-bahaya-latar text-bahaya"}`}
        >
          {pesan.teks}
        </p>
      )}
      {sesi.peran === "konten" ? <RingkasanKonten nama={sesi.nama} /> : <RingkasanPendaftar />}
    </div>
  );
}

function RingkasanKonten({ nama }: { nama: string }) {
  return (
    <div className="mt-6">
      <p className="text-tinta-redup">Selamat datang, {nama}. Kelola isi situs dari menu Konten di sisi kiri.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Berita", "/admin/berita"],
          ["Agenda", "/admin/agenda"],
          ["Foto Beranda", "/admin/foto-beranda"],
          ["Galeri", "/admin/galeri"],
          ["Testimoni", "/admin/testimoni"],
          ["FAQ", "/admin/faq"],
        ].map(([label, href]) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-14 items-center rounded-kartu border border-garis bg-permukaan px-4 font-semibold text-primer-tua hover:bg-permukaan-alt"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function RingkasanPendaftar() {
  const d = await ambilDashboard();
  const kartu = [
    { label: "Total pendaftar", nilai: d.total, href: "/admin/peserta" },
    // Semua pendaftar langsung diterima (PRD 1.3 butir 62, 63): tidak ada kartu status, jumlahnya sama dengan total.
    { label: "Nilai belum dicek", nilai: d.nilaiBelumDicek, href: "/admin/peserta?nilai=belumDicek" },
  ];
  const maksSebaran = Math.max(1, ...d.perJurusan.flatMap((j) => [j.terdaftar, j.rekomendasi]));

  return (
    <>
      <p className="mt-1 text-tinta-redup">
        Tahun ajaran <span className="angka font-semibold">{d.periode}</span>
      </p>

      {d.peringatan.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2" aria-label="Peringatan">
          {d.peringatan.map((w) => (
            <li
              key={w.teks}
              className={`flex items-start gap-3 rounded-kontrol px-4 py-3 text-sm font-semibold ${w.nada === "bahaya" ? "bg-bahaya-latar text-bahaya" : "bg-peringatan-latar text-peringatan"}`}
            >
              <WarningCircleIcon aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0" />
              <span>
                {w.teks}
                {w.href && (
                  <>
                    {" "}
                    <Link href={w.href} className="underline underline-offset-4">
                      Lihat
                    </Link>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {kartu.map((k) => (
          <li key={k.label}>
            <Link href={k.href} className="block rounded-kartu border border-garis bg-permukaan p-4 hover:bg-permukaan-alt">
              <p className="angka font-display text-3xl font-bold text-ink">{k.nilai}</p>
              <p className="mt-1 text-sm font-semibold text-tinta-redup">{k.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold text-ink">Pendaftar per hari</h2>
          <div className="mt-4">
            <GrafikPerHari data={d.perHari} />
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-ink">Kuota per jurusan</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {d.perJurusan.map((j) => (
              <li key={j.kode}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-tinta">
                    {j.kode} <span className="font-medium text-tinta-redup">{j.nama}</span>
                  </span>
                  <span className="angka text-tinta-redup">
                    {j.terdaftar} / {j.kuota} ({j.persen}%)
                  </span>
                </div>
                <div className="mt-1.5">
                  <BatangProgres persen={j.persen} nada={j.persen >= 100 ? "bahaya" : j.persen >= 80 ? "peringatan" : "primer"} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-bold text-ink">Saran jurusan dibanding pilihan siswa</h2>
          <p className="mt-1 text-sm text-tinta-redup">
            Berapa pendaftar yang disarankan tiap jurusan oleh nilai rapor, dibanding yang memilihnya sebagai pilihan 1.
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {d.perJurusan.map((j) => (
              <li key={j.kode}>
                <p className="text-sm font-bold text-tinta">{j.kode}</p>
                <dl className="mt-2 flex flex-col gap-2 text-xs text-tinta-redup">
                  <div>
                    <dt className="flex justify-between">
                      <span>Saran rapor</span>
                      <span className="angka font-semibold text-tinta">{j.rekomendasi}</span>
                    </dt>
                    <dd className="mt-1">
                      <BatangProgres persen={(j.rekomendasi / maksSebaran) * 100} />
                    </dd>
                  </div>
                  <div>
                    <dt className="flex justify-between">
                      <span>Pilihan 1</span>
                      <span className="angka font-semibold text-tinta">{j.terdaftar}</span>
                    </dt>
                    <dd className="mt-1">
                      <BatangProgres persen={(j.terdaftar / maksSebaran) * 100} nada="peringatan" />
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section aria-labelledby="terbaru" className="mt-6">
        <h2 id="terbaru" className="text-lg font-bold text-ink">
          Pendaftar terbaru
        </h2>
        {d.terbaru.length === 0 ? (
          <div className="mt-3">
            <EmptyState judul="Belum ada pendaftar" deskripsi="Pendaftar yang mengirim formulir akan muncul di sini." />
          </div>
        ) : (
          <div className="relative mt-3 overflow-x-auto rounded-kartu border border-garis bg-permukaan">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Delapan pendaftar terbaru</caption>
              <thead className="border-b border-garis bg-permukaan-alt text-tinta-redup">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Nomor</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Nama</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Jurusan</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Dikirim</th>
                </tr>
              </thead>
              <tbody>
                {d.terbaru.map((t) => (
                  <tr key={t.id} className="border-b border-garis last:border-0">
                    <td className="angka px-4 py-2.5 font-semibold">
                      <Link href={`/admin/peserta/${t.id}`} className="text-primer-tua underline underline-offset-4">
                        {t.nomor}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{t.nama}</td>
                    <td className="px-4 py-2.5">{t.jurusan ?? "-"}</td>
                    <td className="angka px-4 py-2.5 text-tinta-redup">{formatTanggal(t.dikirim)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
