import { ApiError, apiFetch } from "@/lib/api-client";

export type PetaGalat = Record<string, string>;

/** Ubah galat API menjadi pesan per field (pesan pertama tiap kunci) dan pesan umum. */
export function pecahGalat(e: unknown): { umum?: string; field: PetaGalat } {
  if (e instanceof ApiError) {
    const field: PetaGalat = {};
    for (const [k, v] of Object.entries(e.errors ?? {})) field[k] = v[0];
    return { umum: Object.keys(field).length > 0 && e.status === 422 ? undefined : e.message, field };
  }
  return { umum: "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.", field: {} };
}

export const jsonPost = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function simpanLangkahKlien(langkah: number, data: unknown) {
  return apiFetch<{ langkahTerakhir: number; peringatan?: string }>(`/draf/langkah/${langkah}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
