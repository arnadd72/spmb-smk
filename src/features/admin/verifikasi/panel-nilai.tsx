"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";

type Mapel = { kode: string; nama: string };
type Grid = Record<string, Record<string, string>>;

const LABEL_NILAI = { belumDicek: ["Belum dicek", "netral"], sesuai: ["Sesuai dengan rapor", "sukses"], dikoreksi: ["Dikoreksi panitia", "peringatan"] } as const;

/** Tabel nilai rapor untuk diperiksa panitia: "Nilai sesuai" atau koreksi sel. Sel yang diubah ditandai. */
export function PanelNilai({
  id,
  semester,
  mapel,
  nilai,
  asli,
  statusNilai,
  sumber,
}: {
  id: string;
  semester: number[];
  mapel: Mapel[];
  nilai: Record<string, Record<string, number>>;
  /** Nilai sebelum koreksi pertama (bila pernah dikoreksi). */
  asli?: Record<string, Record<string, number>>;
  statusNilai: keyof typeof LABEL_NILAI;
  sumber: string;
}) {
  const router = useRouter();
  const awal: Grid = Object.fromEntries(mapel.map((m) => [m.kode, Object.fromEntries(semester.map((s) => [String(s), nilai[m.kode]?.[String(s)]?.toString() ?? ""]))]));
  const [grid, setGrid] = useState<Grid>(awal);
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [sibuk, setSibuk] = useState<"sesuai" | "koreksi">();
  const [info, setInfo] = useState<string>();

  const berubah = mapel.some((m) => semester.some((s) => (grid[m.kode]?.[String(s)] ?? "") !== awal[m.kode][String(s)]));
  const [label, nada] = LABEL_NILAI[statusNilai];

  function ubah(kode: string, s: number, v: string) {
    setGrid((g) => ({ ...g, [kode]: { ...g[kode], [s]: v } }));
    setGalat((x) => ({ ...x, [kode]: "" }));
    setInfo(undefined);
  }

  async function kirim(aksi: "sesuai" | "koreksi") {
    setGalatUmum(undefined);
    setInfo(undefined);
    setSibuk(aksi);
    try {
      const badan =
        aksi === "sesuai"
          ? { aksi }
          : { aksi, mapel: Object.fromEntries(Object.entries(grid).map(([k, sel]) => [k, Object.fromEntries(Object.entries(sel).map(([a, b]) => [a, b.replace(",", ".")]))])) };
      await apiFetch(`/admin/peserta/${id}/nilai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(badan) });
      setInfo(aksi === "sesuai" ? "Nilai dinyatakan sesuai." : "Koreksi tersimpan dan saran jurusan dihitung ulang.");
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.errors) {
        const peta: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.errors)) peta[k.split(".")[1] ?? k] = v[0];
        setGalat(peta);
        setGalatUmum("Periksa kembali nilai yang ditandai.");
      } else setGalatUmum(e instanceof ApiError ? e.message : "Tidak dapat terhubung ke server.");
    } finally {
      setSibuk(undefined);
    }
  }

  return (
    <section aria-labelledby="judul-nilai">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="judul-nilai" className="text-lg font-bold text-ink">
          Nilai rapor
        </h2>
        <Badge nada={nada}>{label}</Badge>
      </div>
      <p className="mt-1 text-sm text-tinta-redup">
        Sumber isian: {sumber}. Cocokkan dengan berkas rapor di sebelah kiri. Sel yang diubah dari nilai awal pendaftar diberi garis tebal.
      </p>

      <ul className="mt-3 flex flex-col gap-3">
        {mapel.map((m) => (
          <li key={m.kode} className="rounded-kontrol border border-garis p-2.5">
            <p className="text-sm font-semibold text-tinta">{m.nama}</p>
            <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${semester.length}, minmax(0, 1fr))` }}>
              {semester.map((s) => {
                const asliSel = asli?.[m.kode]?.[String(s)];
                const beda = asliSel !== undefined && String(asliSel) !== (grid[m.kode]?.[String(s)] ?? "");
                return (
                  <label key={s} className="flex flex-col gap-0.5 text-center text-xs font-semibold text-tinta-redup">
                    S{s}
                    <Input
                      inputMode="decimal"
                      aria-label={`${m.nama} semester ${s}`}
                      aria-invalid={galat[m.kode] ? true : undefined}
                      value={grid[m.kode]?.[String(s)] ?? ""}
                      onChange={(e) => ubah(m.kode, s, e.target.value)}
                      title={beda ? `Nilai awal pendaftar: ${asliSel}` : undefined}
                      className={cn("angka px-1 text-center", (grid[m.kode]?.[String(s)] ?? "") !== awal[m.kode][String(s)] && "border-2 border-aksen", beda && "border-2 border-aksen")}
                    />
                  </label>
                );
              })}
            </div>
            {galat[m.kode] && (
              <p role="alert" className="mt-1 text-sm font-medium text-bahaya">
                {galat[m.kode]}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div aria-live="polite" className="mt-3 min-h-5 text-sm">
        {galatUmum && (
          <p role="alert" className="font-semibold text-bahaya">
            {galatUmum}
          </p>
        )}
        {info && (
          <p className="flex items-center gap-1.5 font-semibold text-sukses">
            <CheckIcon aria-hidden weight="bold" className="size-4" />
            {info}
          </p>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button varian="sekunder" memuat={sibuk === "sesuai"} disabled={berubah || sibuk !== undefined} onClick={() => kirim("sesuai")}>
          Nilai sesuai
        </Button>
        <Button memuat={sibuk === "koreksi"} disabled={!berubah || sibuk !== undefined} onClick={() => kirim("koreksi")}>
          Simpan koreksi nilai
        </Button>
      </div>
    </section>
  );
}
