import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatCircleDotsIcon, FilePdfIcon, PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BatangProgres } from "@/features/admin/dashboard/grafik";
import { KelolaBerkas } from "@/features/admin/peserta/kelola-berkas";
import { StatusBadge } from "@/features/admin/peserta/status-badge";
import { formatTanggal } from "@/lib/format";
import { ambilBerkasPendaftar } from "@/server/actions/berkas";
import { ambilPeserta } from "@/server/actions/peserta";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";
import { prisma } from "@/server/db/client";
import { muatDefinisiField } from "@/server/services/draf";
import { GalatApi } from "@/server/types/galat";
import { NAMA_LANGKAH, rataMapel, type DefinisiField } from "@/server/validasi/wizard";

export const metadata = { title: "Detail pendaftar" };

type Skor = { kode: string; nama: string; skor: number; label: string; penjelasan?: string; rincian: { kode: string; nama: string; bobot: number; nilai: number; kontribusi: number }[] };
type Rapor = { semester: number[]; mapel: Record<string, Record<string, number>> };

const LABEL_NILAI = { belumDicek: "Belum dicek", sesuai: "Sesuai dengan rapor", dikoreksi: "Dikoreksi panitia" } as const;
const LABEL_AKSI: Record<string, string> = {
  "pendaftar.ubah": "Data diubah",
  "pendaftar.formulir": "Formulir PDF dibuka",
  "pendaftar.setujui": "Disetujui",
  "pendaftar.revisi": "Diminta revisi",
  "pendaftar.tolak": "Ditolak",
  "pendaftar.nilai_sesuai": "Nilai dinyatakan sesuai",
  "pendaftar.nilai_koreksi": "Nilai dikoreksi",
  "pendaftar.berkas_lihat": "Berkas dilihat",
};

function tampil(f: DefinisiField, v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  if (f.tipe === "date" && typeof v === "string") return formatTanggal(v);
  if ((f.tipe === "select" || f.tipe === "radio") && f.opsi) return f.opsi.find((o) => o.nilai === v)?.label ?? String(v);
  if (typeof v === "object") return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k.replace("_", " ")} ${x}`).join(", ");
  return String(v);
}

export default async function DetailPendaftar({ params, searchParams }: PageProps<"/admin/peserta/[id]">) {
  await wajibPeranHalaman(...PERAN.pendaftar);
  const { id } = await params;
  const baru = (await searchParams).baru === "1";
  let p;
  try {
    p = await ambilPeserta(id);
  } catch (e) {
    if (e instanceof GalatApi && e.status === 404) notFound();
    throw e;
  }
  const [fields, mapel, berkas] = await Promise.all([
    muatDefinisiField(),
    prisma.mataPelajaran.findMany({ select: { kode: true, nama: true } }),
    ambilBerkasPendaftar(id),
  ]);
  const namaMapel = new Map(mapel.map((m) => [m.kode, m.nama]));
  const rapor = p.nilaiRapor as Rapor;
  const skor = (p.rekomendasiSkor as Skor[]) ?? [];

  const bagian = [1, 5, 6, 7].map((l) => ({
    judul: NAMA_LANGKAH[l - 1],
    baris: fields
      .filter((f) => f.langkah === l && f.tipe !== "file" && f.tipe !== "tabel" && f.tipe !== "checkbox")
      .map((f) => ({ label: f.label, nilai: tampil(f, p.nilai[f.kunci]) })),
  }));
  bagian[3].baris.push(...Object.entries((p.nilai.nilai_ujian ?? {}) as Record<string, number>).map(([k, v]) => ({ label: `Nilai ujian ${k.replace("_", " ")}`, nilai: String(v) })));

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm">
        <Link href="/admin/peserta" className="font-semibold text-primer-tua underline underline-offset-4">
          Data peserta
        </Link>
      </p>
      {baru && (
        <p role="status" className="mt-3 rounded-kontrol bg-sukses-latar px-4 py-3 text-sm font-semibold text-sukses">
          Pendaftar luring tersimpan dengan nomor {p.nomor}. Unggah berkas akta, KK, dan rapor di bagian Berkas bila ada.
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink">{String(p.nilai.nama_lengkap)}</h1>
          <p className="angka mt-1 font-semibold text-tinta-redup">
            {p.nomor} · {p.periode} · {p.sumber}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/verifikasi/${p.id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-kontrol border border-primer px-4 text-sm font-semibold text-primer-tua hover:bg-permukaan-alt"
          >
            Verifikasi
          </Link>
          <Link
            href={`/admin/peserta/${p.id}/ubah`}
            className="inline-flex min-h-11 items-center gap-2 rounded-kontrol border border-primer px-4 text-sm font-semibold text-primer-tua hover:bg-permukaan-alt"
          >
            <PencilSimpleIcon aria-hidden className="size-5" />
            Ubah data
          </Link>
          <a
            href={`/api/v1/admin/peserta/${p.id}/formulir`}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center gap-2 rounded-kontrol bg-primer px-4 text-sm font-semibold text-primer-tinta hover:bg-primer-tua"
          >
            <FilePdfIcon aria-hidden className="size-5" />
            Formulir PDF
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-bold text-ink">Status</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge status={p.status} />
            <Badge nada={p.statusNilai === "sesuai" ? "sukses" : p.statusNilai === "dikoreksi" ? "peringatan" : "netral"}>
              Nilai: {LABEL_NILAI[p.statusNilai as keyof typeof LABEL_NILAI]}
            </Badge>
          </div>
          {(p.catatanVerifikasi || p.catatanPenolakan) && (
            <p className="mt-3 rounded-kontrol bg-permukaan-alt px-3 py-2.5 text-sm">
              <span className="font-semibold">Catatan panitia: </span>
              {p.catatanPenolakan ?? p.catatanVerifikasi}
            </p>
          )}
          {p.diverifikasiOleh && p.diverifikasiAt && (
            <p className="mt-3 text-sm text-tinta-redup">
              Diverifikasi oleh {p.diverifikasiOleh} pada {formatTanggal(p.diverifikasiAt)}.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-ink">Kontak</h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div>
              <dt className="text-tinta-redup">No. HP murid</dt>
              <dd className="angka font-semibold">{String(p.nilai.no_hp || "-")}</dd>
            </div>
            <div>
              <dt className="text-tinta-redup">No. HP orang tua</dt>
              <dd className="angka font-semibold">{String(p.nilai.no_hp_ortu || "-")}</dd>
            </div>
          </dl>
          {p.waLink && (
            <a
              href={p.waLink}
              target="_blank"
              rel="noopener"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-kontrol border border-primer px-3 text-sm font-semibold text-primer-tua hover:bg-permukaan-alt"
            >
              <ChatCircleDotsIcon aria-hidden className="size-5" />
              Chat WhatsApp
            </a>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {bagian.map((b) => (
          <Card key={b.judul}>
            <h2 className="text-lg font-bold text-ink">{b.judul}</h2>
            <dl className="mt-3 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
              {b.baris.map((r) => (
                <div key={r.label} className="min-w-0">
                  <dt className="text-xs text-tinta-redup">{r.label}</dt>
                  <dd className="break-words text-sm font-medium text-tinta">{r.nilai || "-"}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <h2 className="text-lg font-bold text-ink">Pilihan jurusan dan saran nilai rapor</h2>
        <p className="mt-1 text-sm text-tinta-redup">
          Pilihan 1: <span className="font-semibold text-tinta">{p.jurusan1 ? `${p.jurusan1.kode} · ${p.jurusan1.nama}` : "-"}</span>. Pilihan 2:{" "}
          <span className="font-semibold text-tinta">{p.jurusan2 ? `${p.jurusan2.kode} · ${p.jurusan2.nama}` : "-"}</span>. Saran sistem:{" "}
          <span className="font-semibold text-tinta">{p.rekomendasi ? p.rekomendasi.kode : "-"}</span> (versi bobot <span className="angka">{p.rekomendasiVersi}</span>).
        </p>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {skor.map((s) => (
            <li key={s.kode} className="rounded-kontrol border border-garis p-3">
              <p className="flex items-baseline justify-between gap-2 font-bold text-tinta">
                <span>
                  {s.kode} <span className="font-normal text-tinta-redup">{s.label}</span>
                </span>
                <span className="angka text-xl">{s.skor.toFixed(1)}</span>
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {s.rincian.map((r) => (
                  <li key={r.kode} className="text-xs text-tinta-redup">
                    <span className="flex justify-between">
                      <span>{r.nama}</span>
                      <span className="angka">
                        {r.nilai.toFixed(1)} · {Math.round(r.bobot * 100)}%
                      </span>
                    </span>
                    <BatangProgres persen={r.nilai} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-base font-bold text-ink">
          Nilai rapor <span className="text-sm font-normal text-tinta-redup">(sumber: {p.nilaiRaporSumber})</span>
        </h3>
        <div className="relative mt-2 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <caption className="sr-only">Nilai rapor per mata pelajaran dan semester</caption>
            <thead className="border-b border-garis text-tinta-redup">
              <tr>
                <th scope="col" className="py-2 pr-3 font-semibold">Mata pelajaran</th>
                {rapor.semester.map((s) => (
                  <th key={s} scope="col" className="px-2 py-2 text-center font-semibold">Sem {s}</th>
                ))}
                <th scope="col" className="py-2 pl-3 text-right font-semibold">Rata-rata</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(rapor.mapel).map(([kode, sel]) => (
                <tr key={kode} className="border-b border-garis last:border-0">
                  <th scope="row" className="py-2 pr-3 font-medium">{namaMapel.get(kode) ?? kode}</th>
                  {rapor.semester.map((s) => (
                    <td key={s} className="angka px-2 py-2 text-center">{sel[String(s)] ?? "-"}</td>
                  ))}
                  <td className="angka py-2 pl-3 text-right font-bold">{rataMapel(sel)?.toFixed(1) ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold text-ink">Berkas</h2>
          <p className="mt-1 text-sm text-tinta-redup">
            Sinkron ke Drive:{" "}
            <Badge nada={p.berkasSinkron === "selesai" ? "sukses" : p.berkasSinkron === "gagal" ? "bahaya" : "peringatan"}>{p.berkasSinkron}</Badge>
          </p>
          <KelolaBerkas id={p.id} berkas={berkas} />
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-ink">Riwayat</h2>
          {p.riwayat.length === 0 ? (
            <p className="mt-3 text-sm text-tinta-redup">Belum ada perubahan.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-3">
              {p.riwayat.map((r) => (
                <li key={r.id} className="border-l-2 border-garis pl-3 text-sm">
                  <p className="font-semibold text-tinta">{LABEL_AKSI[r.aksi] ?? r.aksi}</p>
                  <p className="text-xs text-tinta-redup">
                    {r.oleh} · {formatTanggal(r.waktu)}
                  </p>
                  {r.dataBaru && (
                    <p className="mt-1 break-words text-xs text-tinta-redup">
                      {Object.keys(r.dataBaru).join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
