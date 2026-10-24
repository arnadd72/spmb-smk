"use client";

import { useEffect, useId, useRef, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpIcon, ChatCircleDotsIcon, RobotIcon, XIcon } from "@phosphor-icons/react";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/cn";

type Sumber = "aturan" | "faq" | "ai" | "tidak-ada";
type Pesan = { id: number; peran: "pengguna" | "asisten"; teks: string; sumber?: Sumber; tautan?: { label: string; href: string }[]; terkait?: string[] };
type Balasan = { jawaban: string; sumber: Sumber; tautan?: { label: string; href: string }[]; terkait?: string[] };

const TOMBOL_CEPAT = [
  { label: "Persyaratan", tanya: "Apa saja persyaratan pendaftaran?" },
  { label: "Jadwal", tanya: "Kapan jadwal pendaftaran dibuka dan ditutup?" },
  { label: "Cara upload", tanya: "Bagaimana cara mengunggah rapor?" },
  { label: "Jurusan", tanya: "Jurusan apa saja yang ada?" },
  { label: "Rekomendasi", tanya: "Bagaimana rekomendasi jurusan dihitung?" },
  { label: "Edit formulir", tanya: "Bagaimana cara mengedit formulir pendaftaran?" },
];

const SAPAAN: Pesan = {
  id: 0,
  peran: "asisten",
  teks: "Halo! Saya asisten Tanya Sunan. Pilih pertanyaan cepat di bawah atau tulis pertanyaan Anda tentang SPMB SMK Ma'arif NU 1 Wangon.",
};

const KETERANGAN: Record<Sumber, string | null> = {
  aturan: null,
  faq: "Jawaban dari FAQ resmi panitia.",
  ai: "Dijawab asisten AI berdasarkan informasi sekolah. Bisa keliru, pastikan ke panitia untuk hal penting.",
  "tidak-ada": null,
};

/** Widget Tanya Sunan (chatbot): aturan dan FAQ dulu, asisten AI bila tidak ada yang cocok. Mengambang di pojok kanan bawah. */
export function TanyaPanitia() {
  const [buka, setBuka] = useState(false);
  const [pesan, setPesan] = useState<Pesan[]>([SAPAAN]);
  const [isi, setIsi] = useState("");
  const [memuat, setMemuat] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const nomor = useRef(1);
  const idForm = useId();

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [pesan, memuat, buka]);

  async function kirim(teks: string) {
    const t = teks.trim();
    if (t.length < 2 || memuat) return;
    setPesan((p) => [...p, { id: nomor.current++, peran: "pengguna", teks: t }]);
    setIsi("");
    setMemuat(true);
    try {
      const b = await apiFetch<Balasan>("/tanya", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pertanyaan: t }) });
      setPesan((p) => [...p, { id: nomor.current++, peran: "asisten", teks: b.jawaban, sumber: b.sumber, tautan: b.tautan, terkait: b.terkait }]);
    } catch (e) {
      const teksGalat =
        e instanceof ApiError && (e.status === 429 || e.status === 422)
          ? (e.errors?.pertanyaan?.[0] ?? e.message)
          : "Maaf, asisten sedang tidak bisa dihubungi. Coba lagi sebentar atau hubungi panitia.";
      setPesan((p) => [...p, { id: nomor.current++, peran: "asisten", teks: teksGalat, sumber: "tidak-ada" }]);
    } finally {
      setMemuat(false);
      input.current?.focus();
    }
  }

  function saatKirim(e: SyntheticEvent) {
    e.preventDefault();
    void kirim(isi);
  }

  return (
    <Dialog.Root open={buka} onOpenChange={setBuka} modal={false}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            "fixed bottom-4 right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-primer px-4 text-sm font-bold text-primer-tinta shadow-kartu hover:bg-primer-tua print:hidden sm:bottom-6 sm:right-6 sm:px-5",
            buka && "invisible",
          )}
        >
          <ChatCircleDotsIcon aria-hidden weight="fill" className="size-6" />
          Tanya Sunan
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            input.current?.focus();
          }}
          onInteractOutside={(e) => e.preventDefault()}
          aria-describedby={undefined}
          className="fixed bottom-4 left-4 right-4 z-50 flex max-h-[min(36rem,calc(100dvh-2rem))] flex-col overflow-hidden rounded-kartu border border-garis bg-permukaan shadow-kartu print:hidden sm:left-auto sm:bottom-6 sm:right-6 sm:w-[24rem]"
        >
          <header className="flex items-start justify-between gap-3 bg-primer px-4 py-3 text-primer-tinta">
            <div>
              <Dialog.Title className="font-display text-lg font-bold leading-tight">Tanya Sunan</Dialog.Title>
              <p className="text-xs opacity-90">SPMB SMK Ma&apos;arif NU 1 Wangon</p>
            </div>
            <Dialog.Close aria-label="Tutup Tanya Sunan" className="grid size-11 shrink-0 place-items-center rounded-kontrol hover:bg-white/15">
              <XIcon aria-hidden weight="bold" className="size-5" />
            </Dialog.Close>
          </header>

          <div ref={log} data-lenis-prevent role="log" aria-live="polite" aria-label="Percakapan" className="flex min-h-40 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4" tabIndex={0}>
            {pesan.map((m) => (
              <div key={m.id} className={cn("flex flex-col gap-1.5", m.peran === "pengguna" ? "items-end" : "items-start")}>
                <p
                  className={cn(
                    "max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.peran === "pengguna" ? "rounded-br-md bg-primer text-primer-tinta" : "rounded-bl-md bg-permukaan-alt text-tinta",
                  )}
                >
                  {m.teks}
                </p>
                {m.sumber && KETERANGAN[m.sumber] && (
                  <p className="flex max-w-[88%] items-start gap-1.5 text-xs text-tinta-redup">
                    {m.sumber === "ai" && <RobotIcon aria-hidden weight="bold" className="mt-0.5 size-3.5 shrink-0" />}
                    {KETERANGAN[m.sumber]}
                  </p>
                )}
                {m.tautan && m.tautan.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {m.tautan.map((t) => (
                      <Link key={t.href} href={t.href} className="inline-flex min-h-9 items-center rounded-full border border-primer px-3 text-xs font-bold text-primer-tua hover:bg-permukaan-alt">
                        {t.label}
                      </Link>
                    ))}
                  </div>
                )}
                {m.terkait && m.terkait.length > 0 && (
                  <div className="flex max-w-[92%] flex-col items-start gap-1.5">
                    <p className="text-xs font-semibold text-tinta-redup">Pertanyaan terkait:</p>
                    {m.terkait.map((t) => (
                      <button key={t} type="button" onClick={() => void kirim(t)} disabled={memuat} className="min-h-9 rounded-2xl border border-garis px-3 py-1.5 text-left text-xs font-medium text-tinta hover:bg-permukaan-alt disabled:opacity-60">
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {memuat && (
              <p className="self-start rounded-2xl rounded-bl-md bg-permukaan-alt px-3.5 py-2.5 text-sm text-tinta-redup" role="status">
                Sedang mencari jawaban...
              </p>
            )}
          </div>

          {pesan.length <= 1 && (
            <div className="flex flex-wrap gap-2 border-t border-garis px-4 py-3" aria-label="Pertanyaan cepat">
              {TOMBOL_CEPAT.map((t) => (
                <button key={t.label} type="button" onClick={() => void kirim(t.tanya)} disabled={memuat} className="min-h-9 rounded-full border border-primer px-3 text-xs font-bold text-primer-tua hover:bg-permukaan-alt disabled:opacity-60">
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={saatKirim} className="border-t border-garis p-3">
            <div className="flex items-center gap-2">
              <label htmlFor={idForm} className="sr-only">
                Tulis pertanyaan
              </label>
              <input
                ref={input}
                id={idForm}
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                maxLength={300}
                autoComplete="off"
                placeholder="Tulis pertanyaan..."
                className="min-h-11 flex-1 rounded-kontrol border border-garis bg-permukaan px-3 text-base text-tinta placeholder:text-tinta-redup/70"
              />
              <button
                type="submit"
                disabled={memuat || isi.trim().length < 2}
                aria-label="Kirim pertanyaan"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-primer text-primer-tinta hover:bg-primer-tua disabled:opacity-50"
              >
                <ArrowUpIcon aria-hidden weight="bold" className="size-5" />
              </button>
            </div>
            <p className="mt-2 text-xs text-tinta-redup">Jangan menulis NIK, nomor HP, atau data pribadi lain di sini.</p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
