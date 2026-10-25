"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";

/** Tandai pendaftar sudah diperiksa dan bukan orang yang sama dengan pendaftar bernama dan bertanggal lahir sama (poin E). */
export function TombolBukanDuplikat({ id }: { id: string }) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string>();

  async function tandai() {
    setSibuk(true);
    setGalat(undefined);
    try {
      await apiFetch(`/admin/peserta/${id}/bukan-duplikat`, { method: "POST" });
      router.refresh();
    } catch (e) {
      setGalat(e instanceof ApiError ? e.message : "Tidak dapat terhubung ke server.");
      setSibuk(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button varian="sekunder" memuat={sibuk} onClick={tandai}>
        <CheckIcon aria-hidden className="size-5" />
        Bukan pendaftar ganda
      </Button>
      <p aria-live="polite" className="min-h-5 text-sm font-medium text-bahaya">
        {galat}
      </p>
    </div>
  );
}
