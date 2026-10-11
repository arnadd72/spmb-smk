"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";

export type BerkasKelola = { kunci: string; indeks: number; label: string; nama: string; ukuran: number; sumber: "drive" | "sementara" | "hilang" };

const ukuran = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);
const SUMBER = { drive: ["Di Drive", "sukses"], sementara: ["Menunggu Drive", "peringatan"], hilang: ["Tidak tersedia", "bahaya"] } as const;
const SLOT = [
  { kunci: "akta", label: "Akta kelahiran", aksi: "Ganti akta" },
  { kunci: "kk", label: "Kartu keluarga", aksi: "Ganti KK" },
  { kunci: "rapor", label: "Rapor", aksi: "Tambah halaman rapor" },
] as const;

/** Lihat, ganti, tambah, dan hapus berkas pendaftar oleh panitia (PRD 13.5, 13.7). */
export function KelolaBerkas({ id, berkas }: { id: string; berkas: BerkasKelola[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [kunci, setKunci] = useState<string>();
  const [sibuk, setSibuk] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState<string>();
  const [galat, setGalat] = useState<string>();

  const pesan = (e: unknown) => (e instanceof ApiError ? (e.errors?.berkas?.[0] ?? e.message) : "Tidak dapat terhubung ke server.");

  async function unggah(f: File | undefined) {
    if (!f || !kunci) return;
    setSibuk(true);
    setGalat(undefined);
    try {
      const form = new FormData();
      form.set("kunci", kunci);
      form.set("berkas", f);
      await apiFetch(`/admin/peserta/${id}/berkas`, { method: "POST", body: form });
      router.refresh();
    } catch (e) {
      setGalat(pesan(e));
    } finally {
      setSibuk(false);
      setKunci(undefined);
      if (input.current) input.current.value = "";
    }
  }

  async function hapus(b: BerkasKelola) {
    setSibuk(true);
    setGalat(undefined);
    try {
      await apiFetch(`/admin/peserta/${id}/berkas`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kunci: b.kunci, i: b.indeks }) });
      setKonfirmasi(undefined);
      router.refresh();
    } catch (e) {
      setGalat(pesan(e));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div>
      {berkas.length === 0 ? (
        <p className="mt-3 text-sm text-tinta-redup">Belum ada berkas.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {berkas.map((b) => {
            const kode = `${b.kunci}-${b.indeks}`;
            const [teks, nada] = SUMBER[b.sumber];
            return (
              <li key={kode} className="flex flex-wrap items-center gap-2 rounded-kontrol bg-permukaan-alt px-3 py-2 text-sm">
                <FileIcon aria-hidden weight="duotone" className="size-5 shrink-0 text-primer" />
                <a
                  href={`/api/v1/admin/peserta/${id}/berkas?kunci=${b.kunci}&i=${b.indeks}`}
                  target="_blank"
                  rel="noopener"
                  className="min-w-0 flex-1 truncate font-semibold text-primer-tua underline underline-offset-4"
                >
                  {b.label}
                  <span className="sr-only">: {b.nama}</span>
                </a>
                <span className="angka text-xs text-tinta-redup">{ukuran(b.ukuran)}</span>
                <Badge nada={nada}>{teks}</Badge>
                {konfirmasi === kode ? (
                  <span className="flex items-center gap-1">
                    <Button varian="bahaya" memuat={sibuk} onClick={() => hapus(b)}>
                      Yakin hapus
                    </Button>
                    <Button varian="hantu" onClick={() => setKonfirmasi(undefined)}>
                      Batal
                    </Button>
                  </span>
                ) : (
                  <Button varian="hantu" aria-label={`Hapus ${b.label}`} onClick={() => setKonfirmasi(kode)}>
                    <TrashIcon aria-hidden className="size-5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {SLOT.map((s) => (
          <Button
            key={s.kunci}
            varian="sekunder"
            disabled={sibuk}
            onClick={() => {
              setKunci(s.kunci);
              input.current?.click();
            }}
          >
            <UploadSimpleIcon aria-hidden className="size-5" />
            {s.aksi}
          </Button>
        ))}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        aria-label="Pilih berkas untuk diunggah"
        data-unggah-admin
        className="sr-only"
        onChange={(e) => unggah(e.target.files?.[0])}
      />
      <p aria-live="polite" className="mt-2 min-h-5 text-sm">
        {sibuk && <span className="text-tinta-redup">Memproses berkas...</span>}
        {galat && (
          <span role="alert" className="font-semibold text-bahaya">
            {galat}
          </span>
        )}
      </p>
    </div>
  );
}
