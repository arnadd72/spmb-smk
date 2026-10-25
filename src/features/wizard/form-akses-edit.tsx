"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api-client";
import { PesanGalat } from "./bidang";
import { jsonPost, pecahGalat } from "./api";
import { skemaCekStatus } from "./schema-client";

export function FormAksesEdit() {
  const router = useRouter();
  const [nomor, setNomor] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [sibuk, setSibuk] = useState(false);

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    setGalatUmum(undefined);
    const cek = skemaCekStatus.safeParse({ nomor, tanggalLahir: tanggal });
    if (!cek.success) {
      const peta: Record<string, string> = {};
      for (const isu of cek.error.issues) peta[String(isu.path[0])] ??= isu.message;
      setGalat(peta);
      return;
    }
    setGalat({});
    setSibuk(true);
    try {
      await apiFetch<{ berhasil: boolean }>("/edit-formulir/akses", jsonPost(cek.data));
      router.push("/cek-pendaftaran/form");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const peta: Record<string, string> = {};
        for (const [kunci, pesan] of Object.entries(err.errors)) peta[kunci] = pesan[0];
        setGalat(peta);
        setGalatUmum("Periksa kembali data yang Anda masukkan.");
      } else {
        setGalatUmum(pecahGalat(err).umum);
      }
    } finally {
      setSibuk(false);
    }
  }

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-5">
      <Field label="Nomor pendaftaran" wajib galat={galat.nomor} bantuan="Contoh: SPMB-2027-0001">
        <Input value={nomor} onChange={(e) => setNomor(e.target.value)} autoCapitalize="characters" autoComplete="off" name="nomor" />
      </Field>
      <Field label="Tanggal lahir" wajib galat={galat.tanggalLahir}>
        <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} autoComplete="bday" name="tanggalLahir" />
      </Field>
      {galatUmum && <PesanGalat pesan={galatUmum} />}
      <Button type="submit" ukuran="lg" memuat={sibuk} className="w-full">
        {sibuk ? "Memeriksa data" : "Buka pendaftaran"}
      </Button>
    </form>
  );
}
