"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { PesanGalat } from "./bidang";
import { pecahGalat, simpanLangkahKlien } from "./api";

export type KartuRekomendasi = {
  kode: string;
  nama: string;
  skor: number;
  label: "Paling Sesuai" | "Juga Sesuai" | "Alternatif" | "Data Kurang";
  penjelasan: string;
  rincian: { kode: string; nama: string; bobot: number; nilai: number }[];
};

const NADA = { "Paling Sesuai": "sukses", "Juga Sesuai": "info", Alternatif: "netral", "Data Kurang": "peringatan" } as const;

function Bar({ nilai, tunda }: { nilai: number; tunda: number }) {
  const kurangi = useReducedMotion();
  return (
    <div className="h-2 overflow-hidden rounded-full bg-permukaan-alt" aria-hidden>
      <motion.div
        className="h-full rounded-full bg-primer"
        initial={kurangi ? false : { width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, nilai))}%` }}
        transition={{ duration: 0.5, delay: tunda, ease: "easeOut" }}
      />
    </div>
  );
}

export function LangkahJurusan({
  kartu,
  kuotaPenuh,
  opsi,
  awal,
}: {
  kartu: KartuRekomendasi[];
  kuotaPenuh: string[];
  opsi: { nilai: string; label: string }[];
  awal: { jurusan_1?: string; jurusan_2?: string };
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [j1, setJ1] = useState(awal.jurusan_1 ?? kartu.find((k) => k.label === "Paling Sesuai")?.kode ?? "");
  const [j2, setJ2] = useState(awal.jurusan_2 || "-");
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    setGalatUmum(undefined);
    if (!j1) {
      setGalat({ jurusan_1: "Pilih jurusan pilihan 1." });
      return;
    }
    setMenyimpan(true);
    try {
      await simpanLangkahKlien(4, { jurusan_1: j1, jurusan_2: j2 === "-" || j2 === j1 ? "" : j2 });
      router.push("/daftar/langkah/5");
    } catch (err) {
      const { umum, field } = pecahGalat(err);
      setGalat(field);
      setGalatUmum(umum);
      setMenyimpan(false);
    }
  }

  const penuh = [j1, j2].filter((k) => kuotaPenuh.includes(k));

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-6">
      {kartu.length > 0 ? (
        <p className="text-tinta-redup">Saran ini dihitung dari nilai rapor Anda dengan rumus rata-rata tertimbang. Ini hanya saran, Anda bebas memilih jurusan lain.</p>
      ) : (
        <p className="rounded-kontrol bg-info-latar px-3 py-2.5 text-sm font-medium text-info">
          Nilai rapor tidak diisi, jadi tidak ada skor rekomendasi. Silakan pilih jurusan secara mandiri.
        </p>
      )}

      <ol className="flex flex-col gap-4">
        {kartu.map((k, i) => (
          <motion.li
            key={k.kode}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.06 }}
            className={cn(
              "rounded-kartu border bg-permukaan p-4 sm:p-5",
              k.label === "Paling Sesuai" ? "border-2 border-primer" : "border-garis",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-xl font-bold text-ink">
                  {k.kode} <span className="text-base font-medium text-tinta-redup">{k.nama}</span>
                </p>
                <p className="mt-0.5 text-sm text-tinta-redup">{k.penjelasan}</p>
              </div>
              <div className="sm:text-right">
                <p className="angka font-display text-3xl font-bold text-ink">{k.skor.toFixed(1)}</p>
                <Badge nada={NADA[k.label]}>{k.label}</Badge>
              </div>
            </div>
            <ul className="mt-4 flex flex-col gap-2.5">
              {k.rincian.map((r) => (
                <li key={r.kode}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-tinta">{r.nama}</span>
                    <span className="angka text-tinta-redup">
                      {r.nilai.toFixed(1)} · bobot {Math.round(r.bobot * 100)}%
                    </span>
                  </div>
                  <Bar nilai={r.nilai} tunda={0.1 + i * 0.06} />
                </li>
              ))}
            </ul>
          </motion.li>
        ))}
      </ol>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Pilihan jurusan 1" wajib galat={galat.jurusan_1}>
          <Select opsi={opsi} nilai={j1} onChange={setJ1} name="jurusan_1" />
        </Field>
        <Field label="Pilihan jurusan 2" galat={galat.jurusan_2}>
          <Select
            opsi={[{ nilai: "-", label: "Tidak ada pilihan kedua" }, ...opsi.filter((o) => o.nilai !== j1)]}
            nilai={j2}
            onChange={setJ2}
            name="jurusan_2"
          />
        </Field>
      </div>

      {penuh.length > 0 && (
        <p className="rounded-kontrol bg-peringatan-latar px-3 py-2.5 text-sm font-medium text-peringatan">
          Kuota {penuh.join(" dan ")} saat ini sudah terisi. Anda tetap bisa mendaftar; keputusan akhir ada di panitia.
        </p>
      )}
      {galatUmum && <PesanGalat pesan={galatUmum} />}

      <div className="flex flex-col-reverse gap-3 border-t border-garis pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/daftar/langkah/3"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-kontrol px-4 text-sm font-semibold text-primer-tua hover:bg-permukaan-alt"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          Kembali
        </Link>
        <Button type="submit" ukuran="lg" memuat={menyimpan} penuhMobile>
          {menyimpan ? "Menyimpan" : "Simpan dan lanjut"}
        </Button>
      </div>
    </form>
  );
}
