"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CloudArrowUpIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";

type Hasil = { status: "selesai" | "menunggu" | "gagal"; pesan?: string };

/** Sinkron ulang berkas satu pendaftar ke Google Drive. */
export function TombolSinkron({ id }: { id: string }) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean }>();

  async function sinkron() {
    setSibuk(true);
    setPesan(undefined);
    try {
      const h = await apiFetch<Hasil>(`/admin/peserta/${id}/sinkron`, { method: "POST" });
      setPesan({ ok: h.status === "selesai", teks: h.status === "selesai" ? "Berkas sudah tersimpan di Drive." : (h.pesan ?? "Belum berhasil disinkronkan.") });
      router.refresh();
    } catch (e) {
      setPesan({ ok: false, teks: e instanceof ApiError ? e.message : "Tidak dapat terhubung ke server." });
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button varian="sekunder" memuat={sibuk} onClick={sinkron}>
        <CloudArrowUpIcon aria-hidden className="size-5" />
        Sinkron ulang ke Drive
      </Button>
      <p aria-live="polite" className={`min-h-5 text-sm font-medium ${pesan?.ok ? "text-sukses" : "text-bahaya"}`}>
        {pesan?.teks}
      </p>
    </div>
  );
}

type Massal = { diproses: number; selesai: number; gagal: number; menunggu: number };

/** Sinkron ulang semua berkas yang menunggu atau gagal (maksimal 25 per klik). */
export function TombolSinkronSemua() {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string>();

  async function sinkron() {
    setSibuk(true);
    setPesan(undefined);
    try {
      const h = await apiFetch<Massal>("/admin/sinkron", { method: "POST" });
      setPesan(
        h.diproses === 0
          ? "Tidak ada berkas yang perlu disinkronkan."
          : `${h.selesai} selesai, ${h.gagal} gagal, ${h.menunggu} menunggu (Drive belum terhubung).`,
      );
      router.refresh();
    } catch (e) {
      setPesan(e instanceof ApiError ? e.message : "Tidak dapat terhubung ke server.");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button varian="sekunder" memuat={sibuk} onClick={sinkron}>
        <CloudArrowUpIcon aria-hidden className="size-5" />
        Sinkron ulang semua yang tertunda
      </Button>
      <p aria-live="polite" className="text-sm font-medium text-tinta-redup">
        {pesan}
      </p>
    </div>
  );
}
