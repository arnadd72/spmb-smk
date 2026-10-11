"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/features/admin/peserta/status-badge";

type Mode = "revisi" | "tolak";

const TEKS = {
  revisi: { judul: "Minta pendaftar merevisi data", label: "Catatan revisi", bantuan: "Tulis bagian apa yang perlu diperbaiki. Catatan ini tampil di halaman Cek Status.", tombol: "Kirim permintaan revisi" },
  tolak: { judul: "Tolak pendaftaran", label: "Alasan penolakan", bantuan: "Alasan tampil di halaman Cek Status pendaftar.", tombol: "Tolak pendaftaran" },
} as const;

/** Keputusan verifikasi: setujui, perlu revisi (catatan wajib), tolak (alasan wajib). */
export function AksiVerifikasi({ id, status, berikutnya }: { id: string; status: string; berikutnya: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>();
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState<string>();
  const [sibuk, setSibuk] = useState(false);
  const [info, setInfo] = useState<string>();

  async function kirim(aksi: "setujui" | "revisi" | "tolak") {
    if (aksi !== "setujui" && catatan.trim().length < 5) {
      setGalat(`${TEKS[aksi].label} minimal 5 karakter.`);
      return;
    }
    setSibuk(true);
    setGalat(undefined);
    try {
      await apiFetch(`/admin/peserta/${id}/verifikasi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aksi === "setujui" ? { aksi } : { aksi, catatan }),
      });
      setInfo({ setujui: "Pendaftar disetujui.", revisi: "Permintaan revisi dikirim.", tolak: "Pendaftaran ditolak." }[aksi]);
      setMode(undefined);
      setCatatan("");
      router.refresh();
    } catch (e) {
      setGalat(e instanceof ApiError ? (e.errors ? Object.values(e.errors)[0][0] : e.message) : "Tidak dapat terhubung ke server.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <section aria-labelledby="judul-keputusan" className="rounded-kartu border border-garis bg-permukaan p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="judul-keputusan" className="text-lg font-bold text-ink">
          Keputusan
        </h2>
        <StatusBadge status={status} />
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button memuat={sibuk && !mode} disabled={sibuk || status === "approved"} onClick={() => kirim("setujui")}>
          <CheckCircleIcon aria-hidden weight="bold" className="size-5" />
          Setujui
        </Button>
        <Button varian="sekunder" disabled={sibuk} onClick={() => { setMode("revisi"); setGalat(undefined); }}>
          Perlu revisi
        </Button>
        <Button varian="bahaya" disabled={sibuk} onClick={() => { setMode("tolak"); setGalat(undefined); }}>
          Tolak
        </Button>
      </div>

      <div aria-live="polite" className="mt-3 min-h-5 text-sm">
        {info && <p className="font-semibold text-sukses">{info}</p>}
        {!mode && galat && (
          <p role="alert" className="font-semibold text-bahaya">
            {galat}
          </p>
        )}
      </div>

      {berikutnya ? (
        <Link
          href={`/admin/verifikasi/${berikutnya}`}
          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-kontrol border border-primer px-4 text-sm font-semibold text-primer-tua hover:bg-permukaan-alt"
        >
          Berikutnya (menunggu)
          <ArrowRightIcon aria-hidden className="size-4" />
        </Link>
      ) : (
        <p className="mt-2 text-sm text-tinta-redup">Tidak ada pendaftar lain yang menunggu verifikasi.</p>
      )}

      <Dialog
        buka={Boolean(mode)}
        onBukaChange={(b) => !b && setMode(undefined)}
        judul={mode ? TEKS[mode].judul : ""}
        aksi={
          mode && (
            <>
              <Button varian="sekunder" onClick={() => setMode(undefined)}>
                Batal
              </Button>
              <Button varian={mode === "tolak" ? "bahaya" : "utama"} memuat={sibuk} onClick={() => kirim(mode)}>
                {TEKS[mode].tombol}
              </Button>
            </>
          )
        }
      >
        {mode && (
          <Field label={TEKS[mode].label} wajib bantuan={TEKS[mode].bantuan} galat={galat}>
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={1000} />
          </Field>
        )}
      </Dialog>
    </section>
  );
}
