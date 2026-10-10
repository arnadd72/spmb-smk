import type { ReactNode } from "react";
import { CheckCircleIcon, ClockIcon, InfoIcon, WarningCircleIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

type Nada = "sukses" | "info" | "peringatan" | "bahaya" | "netral";

const nada: Record<Nada, string> = {
  sukses: "bg-sukses-latar text-sukses",
  info: "bg-info-latar text-info",
  peringatan: "bg-peringatan-latar text-peringatan",
  bahaya: "bg-bahaya-latar text-bahaya",
  netral: "bg-permukaan-alt text-tinta",
};

const ikon: Record<Nada, ReactNode> = {
  sukses: <CheckCircleIcon aria-hidden weight="fill" className="size-4" />,
  info: <ClockIcon aria-hidden weight="fill" className="size-4" />,
  peringatan: <WarningCircleIcon aria-hidden weight="fill" className="size-4" />,
  bahaya: <XCircleIcon aria-hidden weight="fill" className="size-4" />,
  netral: <InfoIcon aria-hidden weight="fill" className="size-4" />,
};

/** Selalu ikon + teks, tidak hanya warna (PRD 16.6). */
export function Badge({
  nada: n = "netral",
  children,
  className,
}: {
  nada?: Nada;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold leading-none",
        nada[n],
        className,
      )}
    >
      {ikon[n]}
      {children}
    </span>
  );
}

export type StatusPendaftar = "pending" | "approved" | "revision" | "rejected";

const statusMap: Record<StatusPendaftar, { nada: Nada; label: string }> = {
  pending: { nada: "info", label: "Menunggu Verifikasi" },
  approved: { nada: "sukses", label: "Diterima" },
  revision: { nada: "peringatan", label: "Perlu Revisi" },
  rejected: { nada: "bahaya", label: "Ditolak" },
};

export function BadgeStatus({ status }: { status: StatusPendaftar }) {
  const s = statusMap[status];
  return <Badge nada={s.nada}>{s.label}</Badge>;
}

export type Keyakinan = "HIGH" | "MEDIUM" | "LOW";

/** Lencana keyakinan OCR (PRD 10.4): Tinggi hijau, Perlu dicek kuning. */
export function BadgeKeyakinan({ level }: { level: Keyakinan }) {
  return level === "HIGH" ? (
    <Badge nada="sukses">Tinggi</Badge>
  ) : (
    <Badge nada="peringatan">Perlu dicek</Badge>
  );
}
