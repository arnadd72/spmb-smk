import { Badge } from "@/components/ui/badge";

export const LABEL_STATUS = {
  pending: "Menunggu verifikasi",
  approved: "Diterima",
  revision: "Perlu revisi",
  rejected: "Ditolak",
} as const;

const NADA = { pending: "info", approved: "sukses", revision: "peringatan", rejected: "bahaya" } as const;

export type StatusVerifikasi = keyof typeof LABEL_STATUS;

export function StatusBadge({ status }: { status: string }) {
  const s = status as StatusVerifikasi;
  if (!(s in LABEL_STATUS)) return <Badge>{status}</Badge>;
  return <Badge nada={NADA[s]}>{LABEL_STATUS[s]}</Badge>;
}
