// Klien API untuk KOMPONEN KLIEN. Tampilan dan API satu origin, jadi cukup path relatif /api/v1
// (PRD v4 6.2). Server Component TIDAK boleh memakai ini: panggil fungsi di src/server langsung
// lewat route handler atau server action.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("apiFetch hanya untuk komponen klien. Di server, panggil src/server langsung.");
  }

  const base = process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1";
  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: "include",
    headers: { Accept: "application/json", ...init.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.code ?? "ERROR",
      body.message ?? "Terjadi kesalahan.",
      body.errors,
    );
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
