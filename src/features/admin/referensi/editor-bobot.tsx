"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { hitungPeringkat } from "@/server/validasi/peringkat";

type Mapel = { kode: string; nama: string };
type Jurusan = { id: string; kode: string; nama: string; urutan: number; bobot: Record<string, number> };

const angka = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && v.trim() !== "" ? n : 0;
};
const tampil = (n: number) => String(Math.round(n * 1000) / 1000).replace(".", ",");

/** Editor bobot mata pelajaran per jurusan beserta pratinjau skor dari contoh nilai (sebelum disimpan). */
export function EditorBobot({ mapel, jurusan }: { mapel: Mapel[]; jurusan: Jurusan[] }) {
  const router = useRouter();
  const awal = useMemo(
    () => Object.fromEntries(jurusan.map((j) => [j.kode, Object.fromEntries(mapel.map((m) => [m.kode, j.bobot[m.kode] ? tampil(j.bobot[m.kode]) : ""]))])),
    [jurusan, mapel],
  );
  const [bobot, setBobot] = useState<Record<string, Record<string, string>>>(awal);
  const [contoh, setContoh] = useState<Record<string, string>>(Object.fromEntries(mapel.map((m) => [m.kode, "80"])));
  const [pesan, setPesan] = useState<Record<string, { ok: boolean; teks: string }>>({});
  const [sibuk, setSibuk] = useState<string>();

  const total = (kode: string) => Object.values(bobot[kode]).reduce((a, v) => a + angka(v), 0);
  const berubah = (kode: string) => mapel.some((m) => bobot[kode][m.kode] !== awal[kode][m.kode]);

  // Pratinjau memakai bobot yang sedang diketik, bukan yang tersimpan.
  const pratinjau = useMemo(() => {
    const nama = new Map(mapel.map((m) => [m.kode, m.nama]));
    const data = jurusan.map((j) => ({
      id: j.id,
      kode: j.kode,
      nama: j.nama,
      urutan: j.urutan,
      bobot: mapel.filter((m) => angka(bobot[j.kode][m.kode]) > 0).map((m) => ({ kode: m.kode, nama: nama.get(m.kode) ?? m.kode, bobot: angka(bobot[j.kode][m.kode]) })),
    }));
    const nilai = { semester: [1], mapel: Object.fromEntries(mapel.filter((m) => contoh[m.kode].trim() !== "").map((m) => [m.kode, { "1": Math.min(100, Math.max(0, angka(contoh[m.kode]))) }])) };
    return hitungPeringkat(nilai, data);
  }, [bobot, contoh, jurusan, mapel]);

  function normalisasi(kode: string) {
    const t = total(kode);
    if (t <= 0) return;
    setBobot((b) => ({ ...b, [kode]: Object.fromEntries(Object.entries(b[kode]).map(([k, v]) => [k, angka(v) > 0 ? tampil(angka(v) / t) : ""])) }));
  }

  async function simpan(kode: string) {
    setSibuk(kode);
    setPesan((p) => ({ ...p, [kode]: { ok: true, teks: "" } }));
    try {
      await apiFetch(`/admin/jurusan/${kode}/bobot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bobot: Object.fromEntries(Object.entries(bobot[kode]).map(([k, v]) => [k, angka(v)])) }),
      });
      setPesan((p) => ({ ...p, [kode]: { ok: true, teks: "Bobot tersimpan. Pendaftar lama tidak berubah." } }));
      router.refresh();
    } catch (e) {
      const teks = e instanceof ApiError ? (e.errors ? Object.values(e.errors)[0][0] : e.message) : "Tidak dapat terhubung ke server.";
      setPesan((p) => ({ ...p, [kode]: { ok: false, teks } }));
    } finally {
      setSibuk(undefined);
    }
  }

  return (
    <section aria-labelledby="judul-bobot" className="mt-10">
      <h2 id="judul-bobot" className="text-2xl font-bold text-ink">
        Bobot saran jurusan
      </h2>
      <p className="mt-1 max-w-[66ch] text-tinta-redup">
        Skor jurusan = rata-rata nilai mata pelajaran dikali bobotnya. Bobot tidak harus berjumlah 1: skor selalu dibagi total bobot yang tersedia. Mengubah bobot hanya
        berlaku untuk pendaftar berikutnya.
      </p>

      <ul className="mt-5 grid gap-4 lg:grid-cols-2">
        {jurusan.map((j) => (
          <li key={j.kode}>
            <Card>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-lg font-bold text-ink">
                  {j.kode} <span className="text-sm font-medium text-tinta-redup">{j.nama}</span>
                </h3>
                <Badge nada={Math.abs(total(j.kode) - 1) < 0.0005 ? "sukses" : "netral"}>Total {tampil(total(j.kode))}</Badge>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                {mapel.map((m) => (
                  <li key={m.kode} className="flex items-center justify-between gap-2">
                    <label htmlFor={`bobot-${j.kode}-${m.kode}`} className="min-w-0 truncate text-sm text-tinta">
                      {m.nama}
                    </label>
                    <Input
                      id={`bobot-${j.kode}-${m.kode}`}
                      inputMode="decimal"
                      value={bobot[j.kode][m.kode]}
                      onChange={(e) => setBobot((b) => ({ ...b, [j.kode]: { ...b[j.kode], [m.kode]: e.target.value } }))}
                      className="angka min-h-9 w-20 shrink-0 px-2 text-right"
                    />
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button varian="sekunder" onClick={() => normalisasi(j.kode)} disabled={total(j.kode) <= 0}>
                  Normalisasi ke 1
                </Button>
                <Button memuat={sibuk === j.kode} disabled={!berubah(j.kode) || sibuk !== undefined} onClick={() => simpan(j.kode)}>
                  Simpan bobot {j.kode}
                </Button>
              </div>
              <p aria-live="polite" className={`mt-2 min-h-5 text-sm font-semibold ${pesan[j.kode]?.ok ? "text-sukses" : "text-bahaya"}`}>
                {pesan[j.kode]?.teks}
              </p>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="mt-6">
        <h3 className="text-lg font-bold text-ink">Pratinjau skor</h3>
        <p className="mt-1 text-sm text-tinta-redup">Isi contoh nilai rapor (kosongkan untuk mata pelajaran yang tidak ada), skor dihitung dengan bobot di atas sebelum disimpan.</p>
        <ul className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {mapel.map((m) => (
            <li key={m.kode} className="flex items-center justify-between gap-2">
              <label htmlFor={`contoh-${m.kode}`} className="min-w-0 truncate text-sm text-tinta">
                {m.nama}
              </label>
              <Input
                id={`contoh-${m.kode}`}
                inputMode="decimal"
                value={contoh[m.kode]}
                onChange={(e) => setContoh((c) => ({ ...c, [m.kode]: e.target.value }))}
                className="angka min-h-9 w-16 shrink-0 px-2 text-right"
              />
            </li>
          ))}
        </ul>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Hasil pratinjau">
          {pratinjau.map((p) => (
            <li key={p.kode} className="rounded-kontrol border border-garis p-3">
              <p className="flex items-baseline justify-between gap-2 font-bold text-tinta">
                {p.kode}
                <span className="angka text-xl" data-skor={p.kode}>
                  {p.skor.toFixed(1)}
                </span>
              </p>
              <Badge nada={p.label === "Paling Sesuai" ? "sukses" : p.label === "Data Kurang" ? "peringatan" : p.label === "Juga Sesuai" ? "info" : "netral"}>{p.label}</Badge>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
