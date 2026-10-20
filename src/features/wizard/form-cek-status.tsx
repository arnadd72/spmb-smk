"use client";

import { useState, type SyntheticEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { PesanGalat } from "./bidang";
import { jsonPost, pecahGalat } from "./api";
import { skemaCekStatus } from "./schema-client";

type Hasil = {
  nomor: string;
  nama: string;
  jurusan1: string | null;
  jurusan2: string | null;
  status: "pending" | "approved" | "revision" | "rejected";
  catatan: string | null;
};

const STATUS = {
  pending: { label: "Menunggu verifikasi", nada: "info" },
  approved: { label: "Diterima", nada: "sukses" },
  revision: { label: "Perlu revisi", nada: "peringatan" },
  rejected: { label: "Ditolak", nada: "bahaya" },
} as const;

export function FormCekStatus() {
  const [nomor, setNomor] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [hasil, setHasil] = useState<Hasil>();
  const [sibuk, setSibuk] = useState(false);

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    setGalatUmum(undefined);
    setHasil(undefined);
    const cek = skemaCekStatus.safeParse({ nomor, tanggalLahir: tanggal });
    if (!cek.success) {
      const peta: Record<string, string> = {};
      for (const i of cek.error.issues) peta[String(i.path[0])] ??= i.message;
      setGalat(peta);
      return;
    }
    setGalat({});
    setSibuk(true);
    try {
      setHasil(await apiFetch<Hasil>("/cek-status", jsonPost(cek.data)));
    } catch (err) {
      setGalatUmum(pecahGalat(err).umum);
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={kirim} noValidate className="flex flex-col gap-5">
        <Field label="Nomor pendaftaran" wajib galat={galat.nomor} bantuan="Contoh: SPMB-2027-0001">
          <Input value={nomor} onChange={(e) => setNomor(e.target.value)} autoCapitalize="characters" autoComplete="off" name="nomor" />
        </Field>
        <Field label="Tanggal lahir" wajib galat={galat.tanggalLahir}>
          <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} autoComplete="bday" name="tanggalLahir" />
        </Field>
        {galatUmum && <PesanGalat pesan={galatUmum} />}
        <Button type="submit" ukuran="lg" memuat={sibuk} penuhMobile className="sm:w-fit">
          {sibuk ? "Memeriksa" : "Cek status"}
        </Button>
      </form>

      {hasil && (
        <section aria-labelledby="hasil-cek" className="rounded-kartu border border-garis bg-permukaan p-5" role="status">
          <h2 id="hasil-cek" className="sr-only">
            Hasil pengecekan
          </h2>
          <Badge nada={STATUS[hasil.status].nada}>{STATUS[hasil.status].label}</Badge>
          <p className="angka mt-3 font-display text-2xl font-bold text-ink">{hasil.nomor}</p>
          <p className="font-semibold text-tinta">{hasil.nama}</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-tinta-redup">Pilihan jurusan</dt>
              <dd className="font-medium text-tinta">{hasil.jurusan1 ?? "-"}</dd>
            </div>
          </dl>
          {hasil.catatan && (
            <p className="mt-4 rounded-kontrol bg-permukaan-alt px-3 py-2.5 text-sm text-tinta">
              <span className="font-semibold">Catatan panitia: </span>
              {hasil.catatan}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
