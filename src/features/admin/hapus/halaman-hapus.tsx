"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, useFieldProps } from "@/components/ui/field";
import { Input, kontrolDasar } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { MAKS_PER_PERMINTAAN, type BarisHapus, type HasilHapus, type HasilPratinjau, type PilihanHapus } from "./schema-client";

type Mode = "manual" | "tanggal" | "nomor";
const TAB: { mode: Mode; label: string }[] = [
  { mode: "manual", label: "Pilih manual" },
  { mode: "tanggal", label: "Berdasarkan tanggal" },
  { mode: "nomor", label: "Berdasarkan nomor urut" },
];

type Props = { periodeBawaan: string; periode: string[] };
type Proses = { sedang: boolean; selesai: number; total: number; hasil?: HasilHapus; galat?: string };

function PilihPeriode({ nilai, onChange, semua, opsi }: { nilai: string; onChange: (v: string) => void; semua?: boolean; opsi: string[] }) {
  const a11y = useFieldProps();
  return (
    <select {...a11y} value={nilai} onChange={(e) => onChange(e.target.value)} className={kontrolDasar}>
      {semua && <option value="semua">Semua periode</option>}
      {opsi.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

function pesanGalat(e: unknown): string {
  if (e instanceof ApiError) return e.errors ? Object.values(e.errors).flat()[0] ?? e.message : e.message;
  return "Tidak dapat terhubung ke server.";
}

export function HalamanHapus({ periodeBawaan, periode }: Props) {
  const [mode, setMode] = useState<Mode>("manual");
  const [periodeDipilih, setPeriodeDipilih] = useState("semua");
  const [kata, setKata] = useState("");
  const [baris, setBaris] = useState<BarisHapus[]>([]);
  // Pilihan manual disimpan lengkap (bukan hanya ID) supaya dialog bisa menyebut namanya walau sudah hilang dari hasil pencarian.
  const [dicentang, setDicentang] = useState<Map<string, BarisHapus>>(new Map());
  const [dariTanggal, setDariTanggal] = useState("");
  const [sampaiTanggal, setSampaiTanggal] = useState("");
  const [dariNomor, setDariNomor] = useState("");
  const [sampaiNomor, setSampaiNomor] = useState("");
  // Pratinjau dan galatnya terikat pada pilihan yang menghasilkannya: begitu isian berubah, hasil lama tidak dipakai lagi.
  const [hasilPratinjau, setHasilPratinjau] = useState<{ kunci: string; data: HasilPratinjau } | null>(null);
  const [galatRentang, setGalatRentang] = useState<{ kunci: string; pesan: string } | null>(null);
  const [galatCari, setGalatCari] = useState<string>();
  const [muat, setMuat] = useState(false);
  const [versi, setVersi] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [proses, setProses] = useState<Proses>({ sedang: false, selesai: 0, total: 0 });
  const idPermintaan = useRef(0);

  // Periode bawaan tab tanggal dan nomor: periode berjalan. Tab manual: semua periode, supaya data uji lama ikut tercari.
  const periodeRentang = periodeDipilih === "semua" ? periodeBawaan : periodeDipilih;

  const pilihan: PilihanHapus | null = useMemo(() => {
    if (mode === "tanggal" && dariTanggal && sampaiTanggal) return { mode, periode: periodeRentang, dari: dariTanggal, sampai: sampaiTanggal };
    if (mode === "nomor" && dariNomor !== "" && sampaiNomor !== "") return { mode, periode: periodeRentang, dari: Number(dariNomor), sampai: Number(sampaiNomor) };
    return null;
  }, [mode, periodeRentang, dariTanggal, sampaiTanggal, dariNomor, sampaiNomor]);
  const kunciPilihan = pilihan ? JSON.stringify(pilihan) : null;
  const pratinjau = hasilPratinjau && hasilPratinjau.kunci === kunciPilihan ? hasilPratinjau.data : null;
  const galatPilihan = mode === "manual" ? galatCari : galatRentang && galatRentang.kunci === kunciPilihan ? galatRentang.pesan : undefined;

  function gantiTab(m: Mode) {
    setMode(m);
    setPeriodeDipilih(m === "manual" ? "semua" : periodeBawaan);
  }

  // Tab manual: cari saat mengetik (tunda sebentar), abaikan jawaban yang sudah usang.
  useEffect(() => {
    if (mode !== "manual") return;
    const id = ++idPermintaan.current;
    const t = setTimeout(async () => {
      setMuat(true);
      try {
        const { data } = await apiFetch<{ data: BarisHapus[] }>(`/admin/hapus-pendaftar/cari?q=${encodeURIComponent(kata)}&periode=${encodeURIComponent(periodeDipilih)}`);
        if (id === idPermintaan.current) {
          setBaris(data);
          setGalatCari(undefined);
        }
      } catch (e) {
        if (id === idPermintaan.current) setGalatCari(pesanGalat(e));
      } finally {
        if (id === idPermintaan.current) setMuat(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [mode, kata, periodeDipilih, versi]);

  // Tab tanggal dan nomor urut: pratinjau otomatis begitu isiannya lengkap.
  useEffect(() => {
    if (!pilihan || !kunciPilihan) return;
    const id = ++idPermintaan.current;
    const t = setTimeout(async () => {
      setMuat(true);
      try {
        const { data } = await apiFetch<{ data: HasilPratinjau }>("/admin/hapus-pendaftar/pratinjau", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pilihan),
        });
        if (id === idPermintaan.current) {
          setHasilPratinjau({ kunci: kunciPilihan, data });
          setGalatRentang(null);
        }
      } catch (e) {
        if (id === idPermintaan.current) {
          setHasilPratinjau(null);
          setGalatRentang({ kunci: kunciPilihan, pesan: pesanGalat(e) });
        }
      } finally {
        if (id === idPermintaan.current) setMuat(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pilihan ditentukan sepenuhnya oleh kunciPilihan, versi memuat ulang setelah hapus
  }, [kunciPilihan, versi]);

  const ids = mode === "manual" ? [...dicentang.keys()] : (pratinjau?.ids ?? []);
  const jumlah = ids.length;

  function centang(b: BarisHapus, nilai: boolean) {
    setDicentang((lama) => {
      const baru = new Map(lama);
      if (nilai) baru.set(b.id, b);
      else baru.delete(b.id);
      return baru;
    });
  }

  function tutupDialog() {
    if (proses.sedang) return;
    const selesai = proses.hasil;
    setDialog(false);
    setPassword("");
    setProses({ sedang: false, selesai: 0, total: 0 });
    if (selesai) {
      // Yang gagal tetap tercentang supaya bisa dicoba lagi; yang terhapus hilang dari daftar.
      if (mode === "manual") {
        const gagal = new Set(selesai.gagal.map((g) => g.nomor));
        setDicentang(new Map([...dicentang].filter(([, b]) => gagal.has(b.nomor))));
      }
      setVersi((v) => v + 1);
    }
  }

  async function jalankan() {
    setProses({ sedang: true, selesai: 0, total: ids.length });
    const total: HasilHapus = { terhapus: 0, dilewati: 0, gagal: [], folderHilang: [] };
    try {
      for (let i = 0; i < ids.length; i += MAKS_PER_PERMINTAAN) {
        const potongan = ids.slice(i, i + MAKS_PER_PERMINTAAN);
        const { data } = await apiFetch<{ data: HasilHapus }>("/admin/hapus-pendaftar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: potongan, password }),
        });
        total.terhapus += data.terhapus;
        total.dilewati += data.dilewati;
        total.gagal.push(...data.gagal);
        total.folderHilang.push(...data.folderHilang);
        setProses({ sedang: true, selesai: Math.min(i + potongan.length, ids.length), total: ids.length });
      }
      setProses({ sedang: false, selesai: ids.length, total: ids.length, hasil: total });
    } catch (e) {
      // Password salah atau terkunci menghentikan proses; yang sudah terhapus dilaporkan agar tidak membingungkan.
      const sudah = total.terhapus > 0 ? ` ${total.terhapus} pendaftar sudah terhapus sebelum proses berhenti.` : "";
      setProses({ sedang: false, selesai: 0, total: 0, galat: `${pesanGalat(e)}${sudah}`, hasil: total.terhapus > 0 ? total : undefined });
    }
  }

  const bisaHapus = jumlah > 0 && !muat;
  const hasil = proses.hasil;

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Cara memilih pendaftar" className="flex flex-wrap gap-2">
        {TAB.map((t) => (
          <button
            key={t.mode}
            type="button"
            role="tab"
            id={`tab-${t.mode}`}
            aria-selected={mode === t.mode}
            aria-controls="panel-hapus"
            onClick={() => gantiTab(t.mode)}
            className={cn(
              "min-h-11 rounded-kontrol border px-4 text-sm font-semibold transition-colors",
              mode === t.mode ? "border-primer bg-primer text-primer-tinta" : "border-garis bg-permukaan text-tinta hover:bg-permukaan-alt",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section id="panel-hapus" role="tabpanel" aria-labelledby={`tab-${mode}`} className="rounded-kartu border border-garis bg-permukaan p-5 sm:p-6">
        {mode === "manual" && (
          <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
            <Field label="Cari nama atau nomor pendaftaran">
              <Input value={kata} onChange={(e) => setKata(e.target.value)} placeholder="Ketik nama atau nomor" autoComplete="off" />
            </Field>
            <Field label="Periode">
              <PilihPeriode nilai={periodeDipilih} onChange={setPeriodeDipilih} semua opsi={periode} />
            </Field>
          </div>
        )}
        {mode === "tanggal" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Periode">
              <PilihPeriode nilai={periodeRentang} onChange={setPeriodeDipilih} opsi={periode} />
            </Field>
            <Field label="Dari tanggal" bantuan="Tanggal pendaftaran, waktu Indonesia Barat.">
              <Input type="date" value={dariTanggal} onChange={(e) => setDariTanggal(e.target.value)} />
            </Field>
            <Field label="Sampai tanggal">
              <Input type="date" value={sampaiTanggal} onChange={(e) => setSampaiTanggal(e.target.value)} />
            </Field>
          </div>
        )}
        {mode === "nomor" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Periode">
              <PilihPeriode nilai={periodeRentang} onChange={setPeriodeDipilih} opsi={periode} />
            </Field>
            <Field label="Dari nomor urut" bantuan="Empat angka di ujung nomor pendaftaran, misalnya 1 dari SPMB-2027-0001.">
              <Input type="number" inputMode="numeric" min={0} max={9999} value={dariNomor} onChange={(e) => setDariNomor(e.target.value)} />
            </Field>
            <Field label="Sampai nomor urut">
              <Input type="number" inputMode="numeric" min={0} max={9999} value={sampaiNomor} onChange={(e) => setSampaiNomor(e.target.value)} />
            </Field>
          </div>
        )}

        <div aria-live="polite" className="mt-4 min-h-6 text-sm">
          {galatPilihan && (
            <p role="alert" className="flex items-start gap-2 font-semibold text-bahaya">
              <WarningCircleIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
              {galatPilihan}
            </p>
          )}
          {!galatPilihan && mode !== "manual" && pratinjau && (
            <p className="font-semibold text-tinta">
              <span className="angka">{pratinjau.total}</span> pendaftar akan dihapus
            </p>
          )}
          {!galatPilihan && mode === "manual" && dicentang.size > 0 && (
            <p className="font-semibold text-tinta">
              <span className="angka">{dicentang.size}</span> pendaftar dipilih
            </p>
          )}
        </div>

        {mode === "manual" ? (
          <TabelPendaftar caption="Hasil pencarian pendaftar" kosong={!muat && baris.length === 0 && !galatPilihan} aksi="pilih">
            {baris.map((b) => (
              <tr key={b.id} className="border-t border-garis">
                <td className="w-12 py-2 pr-2">
                  <input
                    type="checkbox"
                    aria-label={`Pilih ${b.nama} (${b.nomor})`}
                    checked={dicentang.has(b.id)}
                    onChange={(e) => centang(b, e.target.checked)}
                    className="size-5 accent-[var(--color-bahaya)]"
                  />
                </td>
                <Sel baris={b} />
              </tr>
            ))}
          </TabelPendaftar>
        ) : (
          pratinjau && (
            <TabelPendaftar caption="Contoh pendaftar yang akan dihapus" kosong={false}>
              {pratinjau.contoh.map((b) => (
                <tr key={b.id} className="border-t border-garis">
                  <Sel baris={b} />
                </tr>
              ))}
            </TabelPendaftar>
          )
        )}
        {mode !== "manual" && pratinjau && pratinjau.total > pratinjau.contoh.length && (
          <p className="mt-2 text-sm text-tinta-redup">
            Menampilkan {pratinjau.contoh.length} pertama dari <span className="angka">{pratinjau.total}</span>.
          </p>
        )}
      </section>

      {bisaHapus && (
        <div className="flex justify-end">
          <Button varian="bahaya" onClick={() => setDialog(true)}>
            Hapus {jumlah} pendaftar
          </Button>
        </div>
      )}

      <Dialog
        buka={dialog}
        onBukaChange={(buka) => !buka && tutupDialog()}
        judul={hasil ? "Penghapusan selesai" : `Hapus ${jumlah} pendaftar secara permanen?`}
        deskripsi={
          hasil
            ? undefined
            : "Data pendaftar dan seluruh folder berkasnya di Google Drive akan dihapus. Hanya catatan siapa yang menghapus tersisa di log audit. Tidak bisa dibatalkan."
        }
        aksi={
          hasil ? (
            <Button onClick={tutupDialog}>Tutup</Button>
          ) : (
            <>
              <Button varian="sekunder" disabled={proses.sedang} onClick={tutupDialog}>
                Batal
              </Button>
              <Button varian="bahaya" memuat={proses.sedang} disabled={!password} onClick={jalankan}>
                Hapus permanen
              </Button>
            </>
          )
        }
      >
        {hasil ? (
          <div className="flex flex-col gap-2 text-sm" aria-live="polite">
            <p className="font-semibold text-tinta">
              <span className="angka">{hasil.terhapus}</span> pendaftar terhapus.
            </p>
            {hasil.dilewati > 0 && (
              <p className="text-tinta-redup">
                <span className="angka">{hasil.dilewati}</span> sudah tidak ada dan dilewati.
              </p>
            )}
            {hasil.gagal.length > 0 && (
              <div className="rounded-kontrol border border-bahaya p-3">
                <p className="font-semibold text-bahaya">
                  <span className="angka">{hasil.gagal.length}</span> gagal dan dibiarkan utuh. Tekan hapus lagi untuk mencoba ulang.
                </p>
                <ul className="mt-1 list-disc pl-5 text-tinta">
                  {hasil.gagal.map((g) => (
                    <li key={g.nomor}>
                      <span className="angka">{g.nomor}</span>: {g.pesan}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {hasil.folderHilang.length > 0 && (
              <p className="rounded-kontrol border border-garis p-3 text-tinta">
                Folder Drive tidak ditemukan untuk{" "}
                {hasil.folderHilang.map((n, i) => (
                  <span key={n}>
                    {i > 0 && ", "}
                    <span className="angka">{n}</span>
                  </span>
                ))}
                . Datanya sudah terhapus; periksa Drive secara manual kalau masih ada folder yang tersisa.
              </p>
            )}
            {proses.galat && <p className="text-bahaya">{proses.galat}</p>}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password && !proses.sedang) void jalankan();
            }}
            className="flex flex-col gap-3"
          >
            {mode === "manual" && (
              <ul aria-label="Pendaftar yang akan dihapus" className="max-h-40 list-disc overflow-y-auto pl-5 text-sm text-tinta">
                {[...dicentang.values()].slice(0, 10).map((b) => (
                  <li key={b.id}>
                    {b.nama} (<span className="angka">{b.nomor}</span>)
                  </li>
                ))}
                {dicentang.size > 10 && <li className="list-none text-tinta-redup">dan {dicentang.size - 10} lainnya</li>}
              </ul>
            )}
            <Field label="Password admin Anda" galat={proses.galat}>
              <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={proses.sedang} />
            </Field>
            {proses.sedang && (
              <div aria-live="polite">
                <progress className="h-2 w-full" max={proses.total} value={proses.selesai} aria-label="Kemajuan penghapusan" />
                <p className="mt-1 text-sm text-tinta-redup">
                  <span className="angka">{proses.selesai}</span> dari <span className="angka">{proses.total}</span> diproses
                </p>
              </div>
            )}
          </form>
        )}
      </Dialog>
    </div>
  );
}

function Sel({ baris }: { baris: BarisHapus }) {
  return (
    <>
      <td className="py-2 pr-3 font-medium text-tinta">
        <span className="angka">{baris.nomor}</span>
      </td>
      <td className="py-2 pr-3 text-tinta">{baris.nama}</td>
      <td className="py-2 text-tinta-redup">
        <span className="angka">{baris.tanggal}</span>
      </td>
    </>
  );
}

function TabelPendaftar({ caption, kosong, aksi, children }: { caption: string; kosong: boolean; aksi?: "pilih"; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-xs uppercase tracking-[0.06em] text-tinta-redup">
            {aksi && (
              <th scope="col" className="py-2 pr-2">
                <span className="sr-only">Pilih</span>
              </th>
            )}
            <th scope="col" className="py-2 pr-3">Nomor</th>
            <th scope="col" className="py-2 pr-3">Nama</th>
            <th scope="col" className="py-2">Tanggal daftar</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {kosong && <p className="py-4 text-sm text-tinta-redup">Tidak ada pendaftar yang cocok.</p>}
    </div>
  );
}
