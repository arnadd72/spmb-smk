"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import {
  ArrowSquareOutIcon,
  CalendarBlankIcon,
  CalendarDotsIcon,
  CaretRightIcon,
  ChartPieSliceIcon,
  ChatCircleTextIcon,
  ClockCounterClockwiseIcon,
  FileArrowDownIcon,
  GearSixIcon,
  GraduationCapIcon,
  HouseLineIcon,
  ImagesIcon,
  KeyIcon,
  ListChecksIcon,
  ListIcon,
  NewspaperIcon,
  QuestionIcon,
  ScanIcon,
  SealCheckIcon,
  ShieldCheckIcon,
  SignOutIcon,
  SquaresFourIcon,
  TrashIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react";
import { GambarLogo } from "@/components/ui/gambar-logo";
import { cn } from "@/lib/cn";
import { LABEL_PERAN, lokasiSaatIni, menuAktif, menuUntuk, type IkonMenu, type PeranMenu } from "./menu-admin";

const IKON: Record<IkonMenu, Icon> = {
  ringkasan: SquaresFourIcon,
  peserta: UsersIcon,
  verifikasi: SealCheckIcon,
  manual: UserPlusIcon,
  ekspor: FileArrowDownIcon,
  gelombang: CalendarBlankIcon,
  kuota: ChartPieSliceIcon,
  berita: NewspaperIcon,
  agenda: CalendarDotsIcon,
  beranda: HouseLineIcon,
  galeri: ImagesIcon,
  testimoni: ChatCircleTextIcon,
  faq: QuestionIcon,
  jurusan: GraduationCapIcon,
  formulir: ListChecksIcon,
  pengaturan: GearSixIcon,
  ocr: ScanIcon,
  akun: ShieldCheckIcon,
  audit: ClockCounterClockwiseIcon,
  hapus: TrashIcon,
  tes: ListChecksIcon,
};

function Merek({ logo }: { logo: string }) {
  return (
    <div className="flex items-center gap-3">
      <GambarLogo src={logo} width={36} height={36} className="size-9 shrink-0 object-contain" />
      <p className="font-display leading-tight">
        <span className="block text-base font-extrabold text-primer-tua">SPMB Admin</span>
        <span className="block text-xs font-semibold text-tinta-redup">SMK Ma&apos;arif NU 1 Wangon</span>
      </p>
    </div>
  );
}

function Menu({ peran, saatKlik }: { peran: PeranMenu; saatKlik?: () => void }) {
  const path = usePathname();
  const awalan = useId();

  return (
    <nav aria-label="Menu admin" className="flex flex-col p-3">
      {menuUntuk(peran).map((g, gi) => (
        <div key={g.nama} className={cn(gi > 0 && "mt-4 border-t border-garis pt-4")}>
          {/* Grup berisi satu item (Dashboard) tampil tanpa judul agar tidak mubazir. */}
          {g.item.length > 1 && <p className="px-3 pb-1.5 text-xs font-bold uppercase tracking-wider text-tinta-redup">{g.nama}</p>}
          <ul className="flex flex-col gap-0.5">
            {g.item.map((i) => {
              const Ikon = IKON[i.ikon];
              const aktif = menuAktif(path, i.href);
              const idKet = `${awalan}-${i.ikon}`;
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={saatKlik}
                    aria-current={aktif ? "page" : undefined}
                    aria-describedby={idKet}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-kontrol px-3 py-2 transition-colors",
                      aktif ? "bg-primer text-primer-tinta" : "text-tinta hover:bg-permukaan-alt",
                    )}
                  >
                    <Ikon aria-hidden weight={aktif ? "fill" : "regular"} className={cn("size-6 shrink-0", !aktif && "text-primer")} />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-tight">{i.label}</span>
                      {/* Keterangan dibaca pembaca layar lewat aria-describedby, bukan menjadi bagian nama tautan. */}
                      <span id={idKet} aria-hidden className={cn("mt-0.5 block text-xs leading-snug", aktif ? "text-primer-tinta/85" : "text-tinta-redup")}>
                        {i.ket}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

const tombolAtas =
  "flex min-h-11 items-center gap-2 rounded-kontrol px-3 text-sm font-semibold text-tinta hover:bg-permukaan-alt";

export function AdminShell({
  children,
  nama = "Panitia SPMB",
  peran = "panitia",
  logo = "/images/sekolah/logo-sekolah.png",
}: {
  children: ReactNode;
  nama?: string;
  peran?: PeranMenu;
  logo?: string;
}) {
  const [buka, setBuka] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const lokasi = lokasiSaatIni(peran, path);
  const inisial = nama.trim().charAt(0).toLocaleUpperCase("id-ID") || "A";

  async function keluar() {
    await fetch("/api/v1/admin/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17.5rem_1fr]">
      <aside className="hidden border-r border-garis bg-permukaan lg:sticky lg:top-0 lg:block lg:h-dvh lg:self-start lg:overflow-y-auto">
        <div className="border-b border-garis p-4">
          <Merek logo={logo} />
        </div>
        <Menu peran={peran} />
      </aside>

      {buka && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu admin">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-hijau-gelap/60" onClick={() => setBuka(false)} />
          <div className="relative h-full w-80 max-w-[88%] overflow-y-auto bg-permukaan">
            <div className="flex items-center justify-between gap-2 border-b border-garis p-3 pl-4">
              <Merek logo={logo} />
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setBuka(false)}
                className="grid size-11 shrink-0 place-items-center rounded-kontrol hover:bg-permukaan-alt"
              >
                <XIcon aria-hidden className="size-5" />
              </button>
            </div>
            <Menu peran={peran} saatKlik={() => setBuka(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-garis bg-latar/95 px-2 backdrop-blur-sm lg:px-6">
          <button
            type="button"
            aria-label="Buka menu"
            onClick={() => setBuka(true)}
            className="grid size-11 shrink-0 place-items-center rounded-kontrol border border-garis bg-permukaan hover:bg-permukaan-alt lg:hidden"
          >
            <ListIcon aria-hidden className="size-6" />
          </button>

          {/* Jejak lokasi: di mana admin sekarang berada. */}
          <p className="min-w-0 flex-1 truncate text-sm text-tinta-redup" data-lokasi>
            {lokasi ? (
              <>
                {lokasi.grup !== "Ringkasan" && (
                  <span className="hidden sm:inline">
                    {lokasi.grup}
                    <CaretRightIcon aria-hidden className="mx-1 inline size-3.5 align-[-2px]" />
                  </span>
                )}
                <span className="font-bold text-tinta">{lokasi.item.label}</span>
              </>
            ) : (
              <span className="font-bold text-tinta">Panel admin</span>
            )}
          </p>

          <a href="/" target="_blank" rel="noopener" className={tombolAtas} title="Buka situs publik di tab baru">
            <ArrowSquareOutIcon aria-hidden className="size-5" />
            <span className="hidden md:inline">Lihat situs</span>
            <span className="sr-only md:hidden">Lihat situs (tab baru)</span>
          </a>
          <Link href="/admin/ganti-password" className={tombolAtas} title="Ganti password akun Anda">
            <KeyIcon aria-hidden className="size-5" />
            <span className="hidden md:inline">Ganti password</span>
            <span className="sr-only md:hidden">Ganti password</span>
          </Link>

          <div className="mx-1 hidden h-8 w-px bg-garis sm:block" aria-hidden />

          <div className="flex items-center gap-2.5" title={`${nama} (${LABEL_PERAN[peran]})`}>
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-sukses-latar text-sm font-extrabold text-primer-tua">
              {inisial}
            </span>
            <p className="hidden min-w-0 leading-tight lg:block">
              <span className="block max-w-40 truncate text-sm font-bold text-tinta">{nama}</span>
              <span className="block text-xs font-semibold text-tinta-redup">{LABEL_PERAN[peran]}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={keluar}
            className="flex min-h-11 items-center gap-2 rounded-kontrol border border-garis bg-permukaan px-3 text-sm font-bold text-tinta hover:bg-permukaan-alt"
          >
            <SignOutIcon aria-hidden className="size-5" />
            Keluar
          </button>
        </header>
        <main id="konten" className="min-w-0 flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
