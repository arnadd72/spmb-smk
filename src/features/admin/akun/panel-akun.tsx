"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CopyIcon, KeyIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, kontrolDasar } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatTanggal } from "@/lib/format";
import { cn } from "@/lib/cn";
import { skemaAkunBaru } from "@/server/validasi/akun";

type Akun = { id: string; nama: string; username: string; peran: "superadmin" | "panitia" | "konten"; isActive: boolean; loginTerakhir: string | Date | null };

const PERAN = { superadmin: "Superadmin", panitia: "Panitia", konten: "Operator konten" } as const;

/** Kelola akun admin: tambah, ubah nama dan peran, nonaktifkan, reset password. Password sementara tampil sekali. */
export function PanelAkun({ akun, saya }: { akun: Akun[]; saya: string }) {
  const router = useRouter();
  const [form, setForm] = useState<{ id?: string; nama: string; username: string; peran: Akun["peran"] }>();
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [sibuk, setSibuk] = useState<string>();
  const [rahasia, setRahasia] = useState<{ username: string; password: string }>();
  const [tersalin, setTersalin] = useState(false);
  const [reset, setReset] = useState<Akun>();
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string }>();

  const pesanGalat = (e: unknown) => (e instanceof ApiError ? (e.errors ? Object.values(e.errors)[0][0] : e.message) : "Tidak dapat terhubung ke server.");

  function buka(a?: Akun) {
    setGalat({});
    setGalatUmum(undefined);
    setForm(a ? { id: a.id, nama: a.nama, username: a.username, peran: a.peran } : { nama: "", username: "", peran: "panitia" });
  }

  async function simpan(e: SyntheticEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.id) {
      const cek = skemaAkunBaru.safeParse(form);
      if (!cek.success) {
        const peta: Record<string, string> = {};
        for (const i of cek.error.issues) peta[String(i.path[0])] ??= i.message;
        setGalat(peta);
        return;
      }
    }
    setSibuk("simpan");
    setGalatUmum(undefined);
    try {
      if (form.id) {
        await apiFetch(`/admin/akun/${form.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nama: form.nama, peran: form.peran }) });
        setPesan({ ok: true, teks: "Perubahan tersimpan. Peran baru berlaku pada permintaan berikutnya." });
      } else {
        const h = await apiFetch<{ username: string; passwordSementara: string }>("/admin/akun", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nama: form.nama, username: form.username, peran: form.peran }),
        });
        setRahasia({ username: h.username, password: h.passwordSementara });
      }
      setForm(undefined);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.errors && !err.errors._) setGalat(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
      else setGalatUmum(pesanGalat(err));
    } finally {
      setSibuk(undefined);
    }
  }

  async function ubahStatus(a: Akun) {
    setSibuk(a.id);
    setPesan(undefined);
    try {
      await apiFetch(`/admin/akun/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !a.isActive }) });
      setPesan({ ok: true, teks: a.isActive ? `${a.username} dinonaktifkan. Sesinya langsung berakhir.` : `${a.username} diaktifkan kembali.` });
      router.refresh();
    } catch (err) {
      setPesan({ ok: false, teks: pesanGalat(err) });
    } finally {
      setSibuk(undefined);
    }
  }

  async function resetPassword() {
    if (!reset) return;
    setSibuk("reset");
    try {
      const h = await apiFetch<{ passwordSementara: string }>(`/admin/akun/${reset.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resetPassword: true }) });
      setRahasia({ username: reset.username, password: h.passwordSementara });
      setReset(undefined);
      router.refresh();
    } catch (err) {
      setReset(undefined);
      setPesan({ ok: false, teks: pesanGalat(err) });
    } finally {
      setSibuk(undefined);
    }
  }

  async function salin() {
    if (!rahasia) return;
    try {
      await navigator.clipboard.writeText(rahasia.password);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      // Izin papan klip ditolak: password tetap tampil untuk disalin manual.
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className={`min-h-5 text-sm font-semibold ${pesan?.ok ? "text-sukses" : "text-bahaya"}`}>
          {pesan?.teks}
        </p>
        <Button onClick={() => buka()}>
          <PlusIcon aria-hidden weight="bold" className="size-5" />
          Tambah akun
        </Button>
      </div>

      <div className="relative mt-4 overflow-x-auto rounded-kartu border border-garis bg-permukaan">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <caption className="sr-only">Daftar akun admin</caption>
          <thead className="border-b border-garis bg-permukaan-alt text-tinta-redup">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Akun</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Peran</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Masuk terakhir</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {akun.map((a) => (
              <tr key={a.id} className={cn("border-b border-garis align-top last:border-0", !a.isActive && "opacity-70")}>
                <th scope="row" className="px-4 py-3 font-semibold text-tinta">
                  {a.nama}
                  {a.id === saya && <span className="ml-1.5 rounded bg-permukaan-alt px-1.5 py-0.5 text-xs font-semibold text-tinta-redup">Anda</span>}
                  <span className="block text-xs font-normal text-tinta-redup">{a.username}</span>
                </th>
                <td className="px-4 py-3">{PERAN[a.peran]}</td>
                <td className="space-y-1 px-4 py-3">
                  {a.isActive ? <Badge nada="sukses">Aktif</Badge> : <Badge>Nonaktif</Badge>}
                </td>
                <td className="angka px-4 py-3 text-tinta-redup">{a.loginTerakhir ? formatTanggal(a.loginTerakhir) : "Belum pernah"}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right">
                  <Button varian="hantu" aria-label={`Ubah ${a.username}`} onClick={() => buka(a)}>
                    <PencilSimpleIcon aria-hidden className="size-5" />
                  </Button>
                  <Button varian="hantu" aria-label={`Reset password ${a.username}`} onClick={() => setReset(a)}>
                    <KeyIcon aria-hidden className="size-5" />
                  </Button>
                  <Button varian="hantu" disabled={a.id === saya || sibuk === a.id} onClick={() => ubahStatus(a)} aria-label={`${a.isActive ? "Nonaktifkan" : "Aktifkan"} ${a.username}`}>
                    {a.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog buka={Boolean(form)} onBukaChange={(b) => !b && setForm(undefined)} judul={form?.id ? "Ubah akun" : "Tambah akun"}>
        {form && (
          <form onSubmit={simpan} noValidate className="flex flex-col gap-4">
            <Field label="Nama" wajib galat={galat.nama}>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </Field>
            <Field label="Username" wajib bantuan={form.id ? "Username tidak bisa diubah." : "Huruf kecil, angka, titik, garis bawah, atau strip."} galat={galat.username}>
              <Input value={form.username} disabled={Boolean(form.id)} autoCapitalize="none" onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </Field>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-tinta">
              Peran
              <select value={form.peran} disabled={form.id === saya} onChange={(e) => setForm({ ...form, peran: e.target.value as Akun["peran"] })} className={cn(kontrolDasar, "font-normal")}>
                {Object.entries(PERAN).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              {form.id === saya && <span className="text-xs font-normal text-tinta-redup">Anda tidak bisa mengubah peran akun sendiri.</span>}
            </label>
            {!form.id && <p className="rounded-kontrol bg-info-latar px-3 py-2 text-sm text-info">Password sementara dibuat otomatis dan ditampilkan sekali. Akun wajib menggantinya saat masuk pertama.</p>}
            {galatUmum && (
              <p role="alert" className="text-sm font-semibold text-bahaya">
                {galatUmum}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" varian="sekunder" onClick={() => setForm(undefined)}>
                Batal
              </Button>
              <Button type="submit" memuat={sibuk === "simpan"}>
                Simpan
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <Dialog
        buka={Boolean(reset)}
        onBukaChange={(b) => !b && setReset(undefined)}
        judul="Reset password?"
        deskripsi={`Password ${reset?.username ?? ""} diganti dengan password sementara baru dan wajib diganti saat masuk. Sesi yang sedang berjalan ikut terkunci sampai password diganti.`}
        aksi={
          <>
            <Button varian="sekunder" onClick={() => setReset(undefined)}>
              Batal
            </Button>
            <Button memuat={sibuk === "reset"} onClick={resetPassword}>
              Ya, reset password
            </Button>
          </>
        }
      />

      <Dialog
        buka={Boolean(rahasia)}
        onBukaChange={(b) => !b && setRahasia(undefined)}
        judul="Password sementara"
        deskripsi="Catat sekarang. Password ini tidak akan ditampilkan lagi dan wajib diganti saat masuk pertama."
        aksi={
          <Button onClick={() => setRahasia(undefined)}>Sudah saya catat</Button>
        }
      >
        {rahasia && (
          <div>
            <p className="text-sm text-tinta-redup">
              Username: <span className="font-semibold text-tinta">{rahasia.username}</span>
            </p>
            <p className="mt-2 break-all rounded-kontrol bg-permukaan-alt px-3 py-3 text-center font-mono text-xl font-bold tracking-wider text-ink" data-password-sementara>
              {rahasia.password}
            </p>
            <Button varian="sekunder" onClick={salin} className="mt-3">
              {tersalin ? <CheckIcon aria-hidden weight="bold" className="size-5" /> : <CopyIcon aria-hidden className="size-5" />}
              <span aria-live="polite">{tersalin ? "Tersalin" : "Salin password"}</span>
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
