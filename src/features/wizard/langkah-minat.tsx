"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { TesMinatBakat } from "@/features/tes-minat/tes-minat-bakat";
import { PesanGalat } from "./bidang";
import { pecahGalat, simpanLangkahKlien } from "./api";
import { Navigasi } from "./langkah-berkas";
import type { JawabanMinat, SoalMinat } from "./schema-client";

/**
 * Langkah 3: tes minat bakat (opsional, PRD 1.3 butir 65). Soal sama dengan halaman Tes Minat Bakat publik, diatur
 * admin di Isi Situs (butir 80).
 * Jawaban disimpan di draf dan dipakai untuk saran jurusan di langkah 4; tanpa tes, tidak ada saran.
 */
export function LangkahMinat({ soal, awal }: { soal: SoalMinat[]; awal?: JawabanMinat }) {
  const router = useRouter();
  const [jawaban, setJawaban] = useState<JawabanMinat | undefined>(awal);
  // Draf yang sudah berisi jawaban langsung membuka tesnya.
  const [ikut, setIkut] = useState(() => (awal ?? []).some((x) => x !== null));
  const [galatUmum, setGalatUmum] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);

  async function kirim(e: SyntheticEvent) {
    e.preventDefault();
    setGalatUmum(undefined);
    setMenyimpan(true);
    try {
      // Tanpa tes, jawaban yang mungkin sempat dipilih tidak ikut tersimpan.
      await simpanLangkahKlien(3, { minat: ikut ? (jawaban ?? []) : [] });
      router.push("/daftar/langkah/4");
    } catch (err) {
      const { umum, field } = pecahGalat(err);
      setGalatUmum(umum ?? field.minat ?? "Jawaban tes belum bisa disimpan. Coba lagi.");
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-ink">Kenali minatmu</h2>
        <p className="mt-1 text-tinta-redup">
          Tes ini tidak wajib. Hasilnya hanya saran jurusan di langkah berikutnya, dan Anda tetap bebas memilih jurusan sendiri.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-tinta">Apakah Anda ingin mendapat saran jurusan dari tes minat bakat?</legend>
        {[
          { nilai: true, judul: "Ya, saya ikut tes minat bakat", isi: `${soal.length} pertanyaan pilihan, sekitar ${Math.max(1, Math.round(soal.length / 3))} menit. Tidak ada jawaban benar atau salah.` },
          { nilai: false, judul: "Tidak, saya akan memilih jurusan sendiri", isi: "Lewati langkah ini; tidak perlu mengerjakan tes." },
        ].map((o) => (
          <label
            key={o.judul}
            className={cn(
              "flex min-h-11 cursor-pointer items-start gap-3 rounded-kartu border p-3 sm:p-4",
              ikut === o.nilai ? "border-primer bg-permukaan-alt" : "border-garis bg-permukaan",
            )}
          >
            <input
              type="radio"
              name="ikut_tes"
              checked={ikut === o.nilai}
              onChange={() => setIkut(o.nilai)}
              className="mt-1 size-5 shrink-0 accent-primer"
            />
            <span>
              <span className="block text-sm font-semibold text-tinta">{o.judul}</span>
              <span className="block text-sm text-tinta-redup">{o.isi}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {ikut && (
        <>
          <p className="text-sm text-tinta-redup">Jawab sesuai minat dan kebiasaanmu. Boleh berhenti di tengah; soal yang sudah dijawab tetap dihitung.</p>
          <TesMinatBakat soal={soal} awal={jawaban} onUbah={setJawaban} />
        </>
      )}

      {galatUmum && <PesanGalat pesan={galatUmum} />}
      <Navigasi langkah={3} menyimpan={menyimpan} />
    </form>
  );
}
