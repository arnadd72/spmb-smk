"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { LockSimpleIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea, kontrolDasar } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { LANGKAH_KUSTOM, TIPE_BERPILIHAN, TIPE_KUSTOM, skemaFieldBaru, skemaUbahField, uraiOpsi } from "@/server/validasi/formField";
import { NAMA_LANGKAH } from "@/server/validasi/wizard";

export type FieldForm = {
  kunci: string;
  langkah: number;
  label: string;
  teksBantuan: string | null;
  tipe: string;
  opsi: { nilai: string; label: string }[] | null;
  opsiDinamis: boolean;
  tampil: boolean;
  wajib: boolean;
  terkunci: boolean;
  urutan: number;
  isKustom: boolean;
};

const NAMA_TIPE: Record<string, string> = {
  text: "Teks",
  textarea: "Teks panjang",
  number: "Angka",
  tel: "Telepon",
  email: "Email",
  date: "Tanggal",
  select: "Pilihan (daftar)",
  radio: "Pilihan (radio)",
  checkbox: "Centang",
  file: "Berkas",
  tabel: "Tabel",
};

type Edit = { baru: boolean; kunci?: string; langkah: number; tipe: string; label: string; teksBantuan: string; tampil: boolean; wajib: boolean; urutan: string; opsi: string; terkunci: boolean; opsiDinamis: boolean };

const BARU: Edit = { baru: true, langkah: 5, tipe: "text", label: "", teksBantuan: "", tampil: true, wajib: false, urutan: "900", opsi: "", terkunci: false, opsiDinamis: false };

/** Form builder: atur isian wizard (tampil, wajib, label, urutan) dan tambah isian kustom. */
export function PanelFormBuilder({ fields }: { fields: FieldForm[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Edit>();
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [sibuk, setSibuk] = useState<string>();
  const [hapus, setHapus] = useState<FieldForm>();
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string }>();

  const muatan = (e: Edit) => ({
    ...(e.baru ? { langkah: e.langkah, tipe: e.tipe } : {}),
    label: e.label,
    teksBantuan: e.teksBantuan,
    tampil: e.tampil,
    wajib: e.wajib,
    urutan: e.urutan,
    ...(TIPE_BERPILIHAN.includes(e.tipe) && !e.opsiDinamis ? { opsi: uraiOpsi(e.opsi) } : {}),
  });

  function buka(f?: FieldForm) {
    setGalat({});
    setGalatUmum(undefined);
    setEdit(
      f
        ? {
            baru: false,
            kunci: f.kunci,
            langkah: f.langkah,
            tipe: f.tipe,
            label: f.label,
            teksBantuan: f.teksBantuan ?? "",
            tampil: f.tampil,
            wajib: f.wajib,
            urutan: String(f.urutan),
            opsi: (f.opsi ?? []).map((o) => (o.nilai === o.label ? o.nilai : `${o.nilai}|${o.label}`)).join("\n"),
            terkunci: f.terkunci,
            opsiDinamis: f.opsiDinamis,
          }
        : BARU,
    );
  }

  async function kirim(url: string, metode: "POST" | "PUT", badan: unknown) {
    await apiFetch(url, { method: metode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(badan) });
  }

  async function simpan(e: SyntheticEvent) {
    e.preventDefault();
    if (!edit) return;
    const badan = muatan(edit);
    const cek = (edit.baru ? skemaFieldBaru : skemaUbahField).safeParse(badan);
    if (!cek.success) {
      const peta: Record<string, string> = {};
      for (const i of cek.error.issues) peta[String(i.path[0])] ??= i.message;
      setGalat(peta);
      return;
    }
    setSibuk("simpan");
    setGalatUmum(undefined);
    try {
      await kirim(edit.baru ? "/admin/form-field" : `/admin/form-field/${edit.kunci}`, edit.baru ? "POST" : "PUT", badan);
      setEdit(undefined);
      setPesan({ ok: true, teks: edit.baru ? "Isian ditambahkan." : "Perubahan tersimpan." });
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setGalat(Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v[0]])));
      else setGalatUmum(err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server.");
    } finally {
      setSibuk(undefined);
    }
  }

  /** Ubah cepat tampil atau wajib dari baris daftar. */
  async function sakelar(f: FieldForm, ubah: Partial<Pick<FieldForm, "tampil" | "wajib">>) {
    const baru = { ...f, ...ubah };
    if (!baru.tampil) baru.wajib = false;
    setSibuk(f.kunci);
    setPesan(undefined);
    try {
      await kirim(`/admin/form-field/${f.kunci}`, "PUT", {
        label: f.label,
        teksBantuan: f.teksBantuan,
        tampil: baru.tampil,
        wajib: baru.wajib,
        urutan: f.urutan,
        ...(f.opsi && !f.opsiDinamis ? { opsi: f.opsi } : {}),
      });
      router.refresh();
    } catch (err) {
      setPesan({ ok: false, teks: err instanceof ApiError ? (err.errors ? Object.values(err.errors)[0][0] : err.message) : "Tidak dapat terhubung ke server." });
    } finally {
      setSibuk(undefined);
    }
  }

  async function hapusField() {
    if (!hapus) return;
    setSibuk("hapus");
    try {
      await apiFetch(`/admin/form-field/${hapus.kunci}`, { method: "DELETE" });
      setHapus(undefined);
      setPesan({ ok: true, teks: "Isian dihapus." });
      router.refresh();
    } catch (err) {
      setHapus(undefined);
      setPesan({ ok: false, teks: err instanceof ApiError ? err.message : "Tidak dapat terhubung ke server." });
    } finally {
      setSibuk(undefined);
    }
  }

  const ubah = <K extends keyof Edit>(k: K, v: Edit[K]) => setEdit((x) => x && { ...x, [k]: v });
  const langkahAda = [...new Set(fields.map((f) => f.langkah))].sort((a, b) => a - b);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className={`min-h-5 text-sm font-semibold ${pesan?.ok ? "text-sukses" : "text-bahaya"}`}>
          {pesan?.teks}
        </p>
        <Button onClick={() => buka()}>
          <PlusIcon aria-hidden weight="bold" className="size-5" />
          Tambah isian kustom
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-8">
        {langkahAda.map((l) => (
          <section key={l} aria-labelledby={`langkah-${l}`}>
            <h2 id={`langkah-${l}`} className="border-b border-garis pb-2 text-lg font-bold text-ink">
              Langkah {l}: {NAMA_LANGKAH[l - 1]}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {fields.filter((f) => f.langkah === l).map((f) => (
                <li key={f.kunci} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 rounded-kontrol border border-garis bg-permukaan px-3 py-2.5", !f.tampil && "opacity-70")}>
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-semibold text-tinta">{f.label}</p>
                    <p className="text-xs text-tinta-redup">
                      {f.kunci} · {NAMA_TIPE[f.tipe] ?? f.tipe} · urutan <span className="angka">{f.urutan}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {f.terkunci && (
                      <Badge>
                        <LockSimpleIcon aria-hidden className="size-3.5" />
                        Terkunci
                      </Badge>
                    )}
                    {f.isKustom && <Badge nada="info">Kustom</Badge>}
                  </div>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-tinta">
                    <input
                      type="checkbox"
                      checked={f.tampil}
                      disabled={f.terkunci || sibuk === f.kunci || f.tipe === "tabel"}
                      onChange={(e) => sakelar(f, { tampil: e.target.checked })}
                      className="size-5 accent-primer"
                      aria-label={`Tampilkan ${f.label}`}
                    />
                    Tampil
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-tinta">
                    <input
                      type="checkbox"
                      checked={f.wajib}
                      disabled={f.terkunci || !f.tampil || sibuk === f.kunci}
                      onChange={(e) => sakelar(f, { wajib: e.target.checked })}
                      className="size-5 accent-primer"
                      aria-label={`Wajibkan ${f.label}`}
                    />
                    Wajib
                  </label>
                  <div className="flex">
                    <Button varian="hantu" aria-label={`Ubah ${f.label}`} onClick={() => buka(f)}>
                      <PencilSimpleIcon aria-hidden className="size-5" />
                    </Button>
                    {f.isKustom && (
                      <Button varian="hantu" aria-label={`Hapus ${f.label}`} onClick={() => setHapus(f)}>
                        <TrashIcon aria-hidden className="size-5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Dialog buka={Boolean(edit)} onBukaChange={(b) => !b && setEdit(undefined)} judul={edit?.baru ? "Tambah isian kustom" : "Ubah isian"}>
        {edit && (
          <form onSubmit={simpan} noValidate className="flex flex-col gap-4">
            {edit.baru && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-tinta">
                  Langkah
                  <select value={edit.langkah} onChange={(e) => ubah("langkah", Number(e.target.value))} className={cn(kontrolDasar, "font-normal")}>
                    {LANGKAH_KUSTOM.map((l) => (
                      <option key={l} value={l}>
                        {l}. {NAMA_LANGKAH[l - 1]}
                      </option>
                    ))}
                  </select>
                  {galat.langkah && <span role="alert" className="text-sm font-medium text-bahaya">{galat.langkah}</span>}
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-tinta">
                  Tipe isian
                  <select value={edit.tipe} onChange={(e) => ubah("tipe", e.target.value)} className={cn(kontrolDasar, "font-normal")}>
                    {TIPE_KUSTOM.map((t) => (
                      <option key={t} value={t}>
                        {NAMA_TIPE[t]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <Field label="Label" wajib galat={galat.label}>
              <Input value={edit.label} onChange={(e) => ubah("label", e.target.value)} />
            </Field>
            <Field label="Teks bantuan" bantuan="Tampil di bawah isian (opsional)." galat={galat.teksBantuan}>
              <Input value={edit.teksBantuan} onChange={(e) => ubah("teksBantuan", e.target.value)} />
            </Field>
            {TIPE_BERPILIHAN.includes(edit.tipe) && !edit.opsiDinamis && (
              <Field label="Pilihan" wajib bantuan="Satu pilihan per baris. Format nilai|label, atau cukup label." galat={galat.opsi}>
                <Textarea rows={5} value={edit.opsi} onChange={(e) => ubah("opsi", e.target.value)} />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <Field label="Urutan" bantuan="Angka kecil tampil lebih dulu." galat={galat.urutan}>
                <Input inputMode="numeric" value={edit.urutan} onChange={(e) => ubah("urutan", e.target.value)} className="angka max-w-32" />
              </Field>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-tinta">
                <input type="checkbox" checked={edit.tampil} disabled={edit.terkunci} onChange={(e) => ubah("tampil", e.target.checked)} className="size-5 accent-primer" />
                Tampil
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-tinta">
                <input type="checkbox" checked={edit.wajib} disabled={edit.terkunci || !edit.tampil} onChange={(e) => ubah("wajib", e.target.checked)} className="size-5 accent-primer" />
                Wajib
              </label>
            </div>
            {(galat.tampil || galat.wajib) && (
              <p role="alert" className="text-sm font-semibold text-bahaya">
                {galat.tampil ?? galat.wajib}
              </p>
            )}
            {galatUmum && (
              <p role="alert" className="text-sm font-semibold text-bahaya">
                {galatUmum}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" varian="sekunder" onClick={() => setEdit(undefined)}>
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
        buka={Boolean(hapus)}
        onBukaChange={(b) => !b && setHapus(undefined)}
        judul="Hapus isian kustom?"
        deskripsi={`Isian "${hapus?.label ?? ""}" hilang dari formulir. Jawaban yang sudah tersimpan di pendaftar lama tidak dihapus.`}
        aksi={
          <>
            <Button varian="sekunder" onClick={() => setHapus(undefined)}>
              Batal
            </Button>
            <Button varian="bahaya" memuat={sibuk === "hapus"} onClick={hapusField}>
              Ya, hapus
            </Button>
          </>
        }
      />
    </div>
  );
}
