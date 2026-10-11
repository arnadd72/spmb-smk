"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api-client";
import { PesanGalat } from "./bidang";
import { pecahGalat } from "./api";

export function TombolMulaiDaftar({ lanjut }: { lanjut: boolean }) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string>();

  async function mulai() {
    setSibuk(true);
    setGalat(undefined);
    try {
      const { langkahTerakhir } = await apiFetch<{ langkahTerakhir: number }>("/draf", { method: "POST" });
      router.push(`/daftar/langkah/${Math.min(langkahTerakhir, 8)}`);
    } catch (e) {
      setGalat(pecahGalat(e).umum);
      setSibuk(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button ukuran="lg" varian="aksen" memuat={sibuk} onClick={mulai} penuhMobile>
        {lanjut ? "Lanjutkan pendaftaran" : "Mulai mendaftar"}
      </Button>
      {galat && <PesanGalat pesan={galat} />}
    </div>
  );
}

/** "Mulai ulang": menghapus draf dan berkas sementaranya setelah konfirmasi. */
export function TombolMulaiUlang() {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [sibuk, setSibuk] = useState(false);

  async function hapus() {
    setSibuk(true);
    try {
      await apiFetch("/draf", { method: "DELETE" });
      setBuka(false);
      router.push("/daftar");
      router.refresh();
    } finally {
      setSibuk(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-2 text-sm font-semibold text-tinta-redup underline underline-offset-4 hover:text-bahaya"
      >
        Mulai ulang
      </button>
      <Dialog
        buka={buka}
        onBukaChange={setBuka}
        judul="Mulai ulang pendaftaran?"
        deskripsi="Semua isian dan berkas yang sudah diunggah pada draf ini akan dihapus. Tindakan ini tidak bisa dibatalkan."
        aksi={
          <>
            <Button varian="sekunder" onClick={() => setBuka(false)}>
              Batal
            </Button>
            <Button varian="bahaya" memuat={sibuk} onClick={hapus}>
              Ya, hapus dan mulai ulang
            </Button>
          </>
        }
      />
    </>
  );
}
