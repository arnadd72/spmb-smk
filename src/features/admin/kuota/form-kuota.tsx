"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BatangProgres } from "@/features/admin/dashboard/grafik";
import { ApiError, apiFetch } from "@/lib/api-client";

type Baris = { kode: string; nama: string; kuota: number; terdaftar: number; sisa: number; persen: number };

/** Edit massal kuota semua jurusan; disimpan dalam satu transaksi. */
export function FormKuota({ awal }: { awal: Baris[] }) {
  const router = useRouter();
  const [nilai, setNilai] = useState<Record<string, string>>(Object.fromEntries(awal.map((b) => [b.kode, String(b.kuota)])));
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string }>();
  const [sibuk, setSibuk] = useState(false);

  const angka = (k: string) => {
    const n = Number(nilai[k]);
    return nilai[k]?.trim() !== "" && Number.isInteger(n) ? n : null;
  };

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    setPesan(undefined);
    const peta: Record<string, string> = {};
    for (const b of awal) {
      const n = angka(b.kode);
      if (n === null) peta[b.kode] = "Isi dengan bilangan bulat.";
      else if (n < 0 || n > 1000) peta[b.kode] = "Kuota antara 0 dan 1000.";
    }
    setGalat(peta);
    if (Object.keys(peta).length > 0) return;

    setSibuk(true);
    try {
      const h = await apiFetch<{ berubah: string[] }>("/admin/kuota", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kuota: Object.fromEntries(awal.map((b) => [b.kode, angka(b.kode)])) }),
      });
      setPesan({ ok: true, teks: h.berubah.length === 0 ? "Tidak ada perubahan." : `Kuota ${h.berubah.join(", ")} disimpan.` });
      router.refresh();
    } catch (err) {
      setPesan({ ok: false, teks: err instanceof ApiError ? (err.errors ? Object.values(err.errors)[0][0] : err.message) : "Tidak dapat terhubung ke server." });
    } finally {
      setSibuk(false);
    }
  }

  return (
    <form onSubmit={kirim} noValidate>
      <div className="relative overflow-x-auto rounded-kartu border border-garis bg-permukaan">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">Kuota per jurusan</caption>
          <thead className="border-b border-garis bg-permukaan-alt text-tinta-redup">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Jurusan</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Kuota</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Terdaftar</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Sisa</th>
              <th scope="col" className="w-40 px-4 py-2.5 font-semibold">Terisi</th>
            </tr>
          </thead>
          <tbody>
            {awal.map((b) => (
              <tr key={b.kode} className="border-b border-garis align-top last:border-0">
                <th scope="row" className="px-4 py-3 font-semibold text-tinta">
                  {b.kode} <span className="block text-xs font-normal text-tinta-redup">{b.nama}</span>
                </th>
                <td className="px-4 py-2.5">
                  <Input
                    inputMode="numeric"
                    aria-label={`Kuota ${b.kode}`}
                    aria-invalid={galat[b.kode] ? true : undefined}
                    value={nilai[b.kode]}
                    onChange={(e) => {
                      setNilai((n) => ({ ...n, [b.kode]: e.target.value }));
                      setGalat((g) => ({ ...g, [b.kode]: "" }));
                    }}
                    className="angka max-w-28"
                  />
                  {galat[b.kode] && (
                    <p role="alert" className="mt-1 text-sm font-medium text-bahaya">
                      {galat[b.kode]}
                    </p>
                  )}
                </td>
                <td className="angka px-4 py-3 text-right font-semibold">{b.terdaftar}</td>
                <td className="angka px-4 py-3 text-right">{b.sisa}</td>
                <td className="px-4 py-3.5">
                  <BatangProgres persen={b.persen} nada={b.persen >= 100 ? "bahaya" : b.persen >= 80 ? "peringatan" : "primer"} />
                  <span className="angka mt-1 block text-xs text-tinta-redup">{b.persen}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" memuat={sibuk}>
          {sibuk ? "Menyimpan" : "Simpan kuota"}
        </Button>
        <p aria-live="polite" className={`text-sm font-semibold ${pesan?.ok ? "text-sukses" : "text-bahaya"}`}>
          {pesan?.teks}
        </p>
      </div>
    </form>
  );
}
