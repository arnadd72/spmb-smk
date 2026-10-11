import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatCircleDotsIcon } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { AksiVerifikasi } from "@/features/admin/verifikasi/aksi-verifikasi";
import { PanelNilai } from "@/features/admin/verifikasi/panel-nilai";
import { PenampilBerkas } from "@/features/admin/verifikasi/penampil-berkas";
import { TombolSinkron } from "@/features/admin/verifikasi/tombol-sinkron";
import { formatTanggal } from "@/lib/format";
import { ambilBerkasPendaftar } from "@/server/actions/berkas";
import { ambilPeserta } from "@/server/actions/peserta";
import { pendaftarBerikutnya } from "@/server/actions/verifikasi";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";
import { prisma } from "@/server/db/client";
import { mapelBerbobot, muatBobotJurusan } from "@/server/services/rekomendasi";
import { GalatApi } from "@/server/types/galat";
import type { NilaiRapor } from "@/server/validasi/wizard";

export const metadata = { title: "Verifikasi pendaftar" };

type Skor = { kode: string; skor: number; label: string };

export default async function ReviewPendaftar({ params }: PageProps<"/admin/verifikasi/[id]">) {
  await wajibPeranHalaman(...PERAN.pendaftar);
  const { id } = await params;
  let p;
  try {
    p = await ambilPeserta(id);
  } catch (e) {
    if (e instanceof GalatApi && e.status === 404) notFound();
    throw e;
  }

  const [berkas, bobot, semuaMapel, berikutnya] = await Promise.all([
    ambilBerkasPendaftar(id),
    muatBobotJurusan(),
    prisma.mataPelajaran.findMany({ select: { kode: true, nama: true } }),
    pendaftarBerikutnya(id),
  ]);
  const rapor = p.nilaiRapor as NilaiRapor;
  const namaMapel = new Map(semuaMapel.map((m) => [m.kode, m.nama]));
  const kode = [...new Set([...mapelBerbobot(bobot).map((m) => m.kode), ...Object.keys(rapor.mapel)])];
  const mapel = kode.map((k) => ({ kode: k, nama: namaMapel.get(k) ?? k }));
  const asli = (p.nilaiRaporKoreksi as { asli?: NilaiRapor } | null)?.asli;
  const skor = (p.rekomendasiSkor as Skor[]) ?? [];
  const n = p.nilai;

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm">
        <Link href="/admin/verifikasi" className="font-semibold text-primer-tua underline underline-offset-4">
          Antrean verifikasi
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold text-ink">{String(n.nama_lengkap)}</h1>
        <p className="angka font-semibold text-tinta-redup">{p.nomor}</p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <h2 className="mb-2 text-lg font-bold text-ink">Berkas</h2>
          <PenampilBerkas id={p.id} berkas={berkas} />
          {p.berkasSinkron !== "selesai" && (
            <div className="mt-3">
              <TombolSinkron id={p.id} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <h2 className="text-lg font-bold text-ink">Data pendaftar</h2>
            <dl className="mt-3 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
              {[
                ["Tempat, tanggal lahir", [n.tempat_lahir, n.tanggal_lahir ? formatTanggal(String(n.tanggal_lahir)) : ""].filter(Boolean).join(", ")],
                ["NISN", String(n.nisn || "")],
                ["NIK", String(n.nik || "")],
                ["No. KK", String(n.no_kk || "")],
                ["Asal sekolah", String(n.asal_sekolah || "")],
                ["Pilihan 1", p.jurusan1 ? `${p.jurusan1.kode} · ${p.jurusan1.nama}` : ""],
                ["Pilihan 2", p.jurusan2 ? `${p.jurusan2.kode} · ${p.jurusan2.nama}` : ""],
                ["Saran dari nilai", skor.length ? skor.map((s) => `${s.kode} ${s.skor.toFixed(1)}`).join(" · ") : ""],
                ["Nama orang tua", [n.nama_ayah, n.nama_ibu].filter(Boolean).join(" / ")],
                ["No. HP", String(n.no_hp || "")],
              ].map(([label, nilai]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-tinta-redup">{label}</dt>
                  <dd className="break-words text-sm font-medium text-tinta">{nilai || "-"}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/admin/peserta/${p.id}`} className="inline-flex min-h-11 items-center rounded-kontrol border border-garis px-3 text-sm font-semibold hover:bg-permukaan-alt">
                Detail lengkap
              </Link>
              <Link href={`/admin/peserta/${p.id}/ubah`} className="inline-flex min-h-11 items-center rounded-kontrol border border-garis px-3 text-sm font-semibold hover:bg-permukaan-alt">
                Ubah data
              </Link>
              {p.waLink && (
                <a href={p.waLink} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1.5 rounded-kontrol border border-primer px-3 text-sm font-semibold text-primer-tua hover:bg-permukaan-alt">
                  <ChatCircleDotsIcon aria-hidden className="size-5" />
                  WhatsApp
                </a>
              )}
            </div>
          </Card>

          <Card>
            <PanelNilai
              id={p.id}
              semester={rapor.semester}
              mapel={mapel}
              nilai={rapor.mapel}
              asli={asli?.mapel}
              statusNilai={p.statusNilai as "belumDicek" | "sesuai" | "dikoreksi"}
              sumber={p.nilaiRaporSumber}
            />
          </Card>

          {(p.catatanVerifikasi || p.catatanPenolakan) && (
            <p className="rounded-kontrol bg-permukaan-alt px-3 py-2.5 text-sm">
              <span className="font-semibold">Catatan sebelumnya: </span>
              {p.catatanPenolakan ?? p.catatanVerifikasi}
            </p>
          )}

          <AksiVerifikasi id={p.id} status={p.status} berikutnya={berikutnya} />
        </div>
      </div>
    </div>
  );
}
