// Klien API tipis. Browser memanggil /api/v1 (domain sama), server component memakai
// BACKEND_INTERNAL_URL (PRD 21.1). Tipe respons berasal dari docs/api/openapi.yaml.

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

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000"}/api/v1`;
  }
  return process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1";
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
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
