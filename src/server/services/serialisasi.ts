/** Ubah hasil Prisma ke objek aman JSON: BigInt jadi string, Date jadi ISO, Decimal jadi angka. */
export function serialisasi<T>(nilai: T): unknown {
  if (nilai === null || nilai === undefined) return nilai;
  if (typeof nilai === "bigint") return nilai.toString();
  if (nilai instanceof Date) return nilai.toISOString();
  if (Array.isArray(nilai)) return nilai.map(serialisasi);
  if (typeof nilai === "object") {
    // Decimal Prisma punya toNumber()
    const anyNilai = nilai as { toNumber?: () => number };
    if (typeof anyNilai.toNumber === "function") return anyNilai.toNumber();
    return Object.fromEntries(Object.entries(nilai as Record<string, unknown>).map(([k, v]) => [k, serialisasi(v)]));
  }
  return nilai;
}
