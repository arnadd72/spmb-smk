"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TombolSinkronSemua } from "@/features/admin/verifikasi/tombol-sinkron";
import { ApiError, apiFetch } from "@/lib/api-client";

type Pengaturan = Record<string, string>;
type StatusDrive = { terhubung: boolean; email: string | null; adaKredensial: boolean };

type DefPengaturan = { kunci: string; label: string; tipe: "teks" | "tanggal" | "area"; bantuan?: string };

const KELOMPOK: { judul: string; field: DefPengaturan[] }[] = [
  {
    judul: "Penerimaan",
    field: [
      { kunci: "tahun_ajaran", label: "Tahun ajaran", tipe: "teks", bantuan: "Format 2027/2028. Dipakai di situs, nomor pendaftaran, dan formulir." },
      { kunci: "gelombang_buka", label: "Pendaftaran dibuka", tipe: "tanggal" },
      { kunci: "gelombang_tutup", label: "Pendaftaran ditutup", tipe: "tanggal" },
      { kunci: "tanggal_verifikasi_fisik", label: "Tanggal verifikasi berkas fisik", tipe: "tanggal", bantuan: "Tercetak di tanda terima berkas." },
      { kunci: "semester_rapor", label: "Semester rapor yang dipakai", tipe: "teks", bantuan: "Nomor semester dipisah koma, mis. 1,2,3,4,5." },
    ],
  },
  {
    judul: "Kontak",
    field: [
      { kunci: "kontak_panitia", label: "Kontak panitia", tipe: "area", bantuan: "Tampil di Tanya Sunan dan halaman bantuan." },
      { kunci: "wa_group_url", label: "Tautan grup WhatsApp", tipe: "teks", bantuan: "Diawali https://. Kosongkan bila tidak ada." },
    ],
  },
  {
    judul: "Teks formulir",
    field: [
      { kunci: "teks_persyaratan", label: "Persyaratan pendaftaran", tipe: "area" },
      { kunci: "teks_persetujuan", label: "Teks persetujuan data pribadi (UU PDP)", tipe: "area", bantuan: "Tampil di Langkah 1 wizard." },
    ],
  },
];

function BagianDrive() {
  const [status, setStatus] = useState<StatusDrive | null>(null);
  const [antrean, setAntrean] = useState<{ menunggu: number; gagal: number } | null>(null);
  const [pesan, setPesan] = useState<{ nada: "sukses" | "bahaya"; teks: string }>();
  const [sibuk, setSibuk] = useState<"uji" | "putus">();

  async function muat() {
    try {
      setStatus(await apiFetch<StatusDrive>("/admin/google-drive/status"));
    } catch {
      setStatus(null);
    }
  }
  useEffect(() => {
    let batal = false;
    apiFetch<StatusDrive>("/admin/google-drive/status")
      .then((r) => !batal && setStatus(r))
      .catch(() => !batal && setStatus(null));
    apiFetch<{ menunggu: number; gagal: number }>("/admin/sinkron")
      .then((r) => !batal && setAntrean(r))
      .catch(() => !batal && setAntrean(null));
    return () => {
      batal = true;
    };
  }, []);

  async function aksi(jenis: "uji" | "putus") {
    setSibuk(jenis);
    setPesan(undefined);
    try {
      await apiFetch(jenis === "uji" ? "/admin/google-drive/uji" : "/admin/google-drive/putuskan", { method: "POST" });
      setPesan({ nada: "sukses", teks: jenis === "uji" ? "Uji tulis, baca, dan hapus berkas berhasil." : "Koneksi Google Drive diputus." });
      await muat();
    } catch (e) {
      setPesan({ nada: "bahaya", teks: e instanceof ApiError ? e.message : "Tidak dapat terhubung ke server." });
    } finally {
      setSibuk(undefined);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-ink">Google Drive</h2>
        {status && (status.terhubung ? <Badge nada="sukses">Terhubung</Badge> : <Badge nada="peringatan">Belum terhubung</Badge>)}
      </div>
      <p className="mt-2 text-tinta-redup">Dokumen pendaftar disimpan di Google Drive dan tidak pernah punya tautan publik.</p>

      {status?.email && <p className="mt-3 text-sm font-semibold text-ink">Akun: {status.email}</p>}
      {status && !status.adaKredensial && (
        <p className="mt-3 rounded-kontrol bg-peringatan-latar px-3 py-2.5 text-sm font-semibold text-peringatan">
          Kredensial OAuth belum diisi di environment server (GOOGLE_DRIVE_CLIENT_ID dan GOOGLE_DRIVE_CLIENT_SECRET).
        </p>
      )}
      {pesan && (
        <p
          role="status"
          className={`mt-3 rounded-kontrol px-3 py-2.5 text-sm font-semibold ${pesan.nada === "sukses" ? "bg-sukses-latar text-sukses" : "bg-bahaya-latar text-bahaya"}`}
        >
          {pesan.teks}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {/* Navigasi penuh (bukan fetch) karena alur OAuth mengalihkan ke Google. */}
        <a
          href="/api/v1/admin/google-drive/hubungkan"
          aria-disabled={!status?.adaKredensial}
          className={`inline-flex min-h-11 items-center rounded-kontrol bg-primer px-4 text-sm font-semibold text-primer-tinta ${status?.adaKredensial ? "hover:bg-primer-tua" : "pointer-events-none opacity-55"}`}
        >
          {status?.terhubung ? "Hubungkan ulang" : "Hubungkan Google Drive"}
        </a>
        <Button varian="sekunder" disabled={!status?.terhubung} memuat={sibuk === "uji"} onClick={() => aksi("uji")}>
          Uji koneksi
        </Button>
        <Button varian="hantu" disabled={!status?.terhubung} memuat={sibuk === "putus"} onClick={() => aksi("putus")}>
          Putuskan
        </Button>
      </div>

      {antrean && (
        <div className="mt-5 border-t border-garis pt-4">
          <p className="text-sm text-tinta">
            Berkas menunggu sinkron: <span className="angka font-bold">{antrean.menunggu}</span> pendaftar. Gagal: <span className="angka font-bold">{antrean.gagal}</span> pendaftar.
          </p>
          {(antrean.menunggu > 0 || antrean.gagal > 0) && (
            <div className="mt-3">
              <TombolSinkronSemua />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function PanelPengaturan() {
  const [nilai, setNilai] = useState<Pengaturan | null>(null);
  const [galat, setGalat] = useState<Record<string, string[]>>({});
  const [pesan, setPesan] = useState<{ nada: "sukses" | "bahaya"; teks: string }>();
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    apiFetch<{ data: Pengaturan }>("/admin/pengaturan")
      .then((r) => setNilai(r.data))
      .catch((e) => setPesan({ nada: "bahaya", teks: e instanceof ApiError ? e.message : "Gagal memuat pengaturan." }));
  }, []);

  async function simpan() {
    if (!nilai) return;
    setMenyimpan(true);
    setGalat({});
    setPesan(undefined);
    try {
      // Kirim hanya yang terisi: kunci kosong (belum pernah diatur) tidak perlu lolos validasi format.
      const body = Object.fromEntries(Object.entries(nilai).filter(([, v]) => v !== ""));
      const r = await apiFetch<{ data: Pengaturan }>("/admin/pengaturan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setNilai(r.data);
      setPesan({ nada: "sukses", teks: "Pengaturan disimpan. Halaman publik diperbarui." });
    } catch (e) {
      if (e instanceof ApiError && e.errors) {
        setGalat(e.errors);
        setPesan({ nada: "bahaya", teks: "Periksa isian yang bertanda galat." });
      } else setPesan({ nada: "bahaya", teks: e instanceof ApiError ? e.message : "Tidak dapat terhubung ke server." });
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-bold text-ink">Pengaturan</h1>

      {nilai === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          {KELOMPOK.map((g) => (
            <Card key={g.judul} className="flex flex-col gap-4">
              <h2 className="text-xl font-bold text-ink">{g.judul}</h2>
              {g.field.map((f) => (
                <Field key={f.kunci} label={f.label} bantuan={f.bantuan} galat={galat[f.kunci]?.[0]}>
                  {f.tipe === "area" ? (
                    <Textarea value={nilai[f.kunci] ?? ""} onChange={(e) => setNilai({ ...nilai, [f.kunci]: e.target.value })} />
                  ) : (
                    <Input
                      type={f.tipe === "tanggal" ? "date" : "text"}
                      value={nilai[f.kunci] ?? ""}
                      onChange={(e) => setNilai({ ...nilai, [f.kunci]: e.target.value })}
                    />
                  )}
                </Field>
              ))}
            </Card>
          ))}

          <div className="flex flex-wrap items-center gap-4">
            <Button ukuran="lg" memuat={menyimpan} onClick={simpan}>
              Simpan pengaturan
            </Button>
            {pesan && (
              <p role="status" className={`text-sm font-semibold ${pesan.nada === "sukses" ? "text-sukses" : "text-bahaya"}`}>
                {pesan.teks}
              </p>
            )}
          </div>
        </>
      )}

      <BagianDrive />
    </div>
  );
}
