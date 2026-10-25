import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatCircleDotsIcon, FilePdfIcon, PencilSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { labelAksi } from "@/features/admin/audit/label";
import { KelolaBerkas } from "@/features/admin/peserta/kelola-berkas";
import { TombolBukanDuplikat } from "@/features/admin/peserta/tombol-bukan-duplikat";
import { PenampilBerkas } from "@/features/admin/verifikasi/penampil-berkas";
import { TombolSinkron } from "@/features/admin/verifikasi/tombol-sinkron";
import { formatTanggal } from "@/lib/format";
import { ambilBerkasPendaftar } from "@/server/actions/berkas";
import { ambilPeserta } from "@/server/actions/peserta";
import { PERAN } from "@/server/auth/peran";
import { wajibPeranHalaman } from "@/server/auth/verifikasiSesi";
import { muatDefinisiField } from "@/server/services/draf";
import { kemungkinanGanda } from "@/server/services/pendaftarGanda";
import { GalatApi } from "@/server/types/galat";
import { NAMA_LANGKAH, type DefinisiField } from "@/server/validasi/wizard";

export const metadata = { title: "Detail pendaftar" };

function tampil(f: DefinisiField, v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  if (f.tipe === "checkbox") return v ? "Ya" : "Tidak";
  if (f.tipe === "date" && typeof v === "string") return formatTanggal(v);
  if ((f.tipe === "select" || f.tipe === "radio") && f.opsi)
    return f.opsi.find((o) => o.nilai === v)?.label ?? String(v);
  if (typeof v === "object")
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${k.replace("_", " ")} ${x}`)
      .join(", ");
  return String(v);
}

export default async function DetailPendaftar({
  params,
  searchParams,
}: PageProps<"/admin/peserta/[id]">) {
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
  const [fields, berkas, ganda] = await Promise.all([muatDefinisiField(), ambilBerkasPendaftar(id), kemungkinanGanda(BigInt(p.id))]);

  const bagian = [1, 5, 6, 7].map((l) => ({
    judul: NAMA_LANGKAH[l - 1],
    baris: fields
      .filter(
        (f) =>
          f.langkah === l &&
          f.tipe !== "file" &&
          f.tipe !== "tabel" &&
          f.kunci !== "setuju" &&
          f.kunci !== "konfirmasi_final",
      )
      .map((f) => ({ label: f.label, nilai: tampil(f, p.nilai[f.kunci]) })),
  }));
  bagian[3].baris.push(
    ...Object.entries((p.nilai.nilai_ujian ?? {}) as Record<string, number>).map(([k, v]) => ({
      label: `Nilai ujian ${k.replace("_", " ")}`,
      nilai: String(v),
    })),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm">
        <Link
          href="/admin/peserta"
          className="font-semibold text-primer-tua underline underline-offset-4"
        >
          Data peserta
        </Link>
      </p>
      {baru && (
        <p
          role="status"
          className="mt-3 rounded-kontrol bg-sukses-latar px-4 py-3 text-sm font-semibold text-sukses"
        >
          Pendaftar luring tersimpan dengan nomor {p.nomor}. Unggah berkas akta, KK, dan pas foto di
          bagian Kelola berkas bila ada.
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

      {ganda.length > 0 && (
        <div role="note" className="mt-4 flex flex-col gap-3 rounded-kartu border border-peringatan/30 bg-peringatan-latar p-4 text-peringatan sm:flex-row sm:items-start sm:justify-between">
          <p className="flex items-start gap-3">
            <WarningCircleIcon aria-hidden weight="fill" className="mt-0.5 size-5 shrink-0" />
            <span>
              <span className="block font-semibold">Kemungkinan pendaftar ganda</span>
              <span className="text-sm">
                Nama dan tanggal lahirnya sama dengan{" "}
                {ganda.map((g, i) => (
                  <span key={g.id}>
                    {i > 0 && ", "}
                    <Link href={`/admin/peserta/${g.id}`} className="angka font-semibold underline underline-offset-4">
                      {g.nomor}
                    </Link>
                  </span>
                ))}
                , dengan NISN berbeda. Periksa apakah orang yang sama; bila bukan, tandai di sini.
              </span>
            </span>
          </p>
          <div className="shrink-0">
            <TombolBukanDuplikat id={p.id} />
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {/* Tanpa status pendaftaran (PRD 1.3 butir 62, 63) dan tanpa nilai rapor maupun hasil tes minat (butir 65). */}
          <h2 className="text-lg font-bold text-ink">Pilihan jurusan</h2>
          <dl className="mt-3 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-tinta-redup">Pilihan 1</dt>
              <dd className="text-sm font-semibold text-tinta">
                {p.jurusan1 ? `${p.jurusan1.kode} · ${p.jurusan1.nama}` : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-tinta-redup">Pilihan 2</dt>
              <dd className="text-sm font-semibold text-tinta">
                {p.jurusan2 ? `${p.jurusan2.kode} · ${p.jurusan2.nama}` : "-"}
              </dd>
            </div>
          </dl>
          {p.sumber === "luring" && p.diverifikasiOleh && p.diverifikasiAt && (
            <p className="mt-3 text-sm text-tinta-redup">
              Dimasukkan oleh {p.diverifikasiOleh} pada {formatTanggal(p.diverifikasiAt)}.
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

      <section aria-label="Berkas" className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <h2 className="mb-2 text-lg font-bold text-ink">Lihat berkas</h2>
          <PenampilBerkas id={p.id} berkas={berkas} />
          {p.berkasSinkron !== "selesai" && (
            <div className="mt-3">
              <TombolSinkron id={p.id} />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <h2 className="text-lg font-bold text-ink">Kelola berkas</h2>
            <p className="mt-1 text-sm text-tinta-redup">
              Sinkron ke Drive:{" "}
              <Badge
                nada={
                  p.berkasSinkron === "selesai"
                    ? "sukses"
                    : p.berkasSinkron === "gagal"
                      ? "bahaya"
                      : "peringatan"
                }
              >
                {p.berkasSinkron}
              </Badge>
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
                    <p className="font-semibold text-tinta">{labelAksi(r.aksi)}</p>
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
      </section>
    </div>
  );
}
