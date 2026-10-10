import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api-client";

afterEach(() => vi.restoreAllMocks());

describe("apiFetch", () => {
  it("mengembalikan JSON saat sukses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "ok" }), { status: 200 })),
    );
    await expect(apiFetch("/health")).resolves.toEqual({ status: "ok" });
  });

  it("melempar ApiError dengan kode dan galat validasi", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: "Data tidak valid.",
            code: "VALIDATION_ERROR",
            errors: { nik: ["NIK harus 16 digit."] },
          }),
          { status: 422 },
        ),
      ),
    );
    await expect(apiFetch("/draf")).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      errors: { nik: ["NIK harus 16 digit."] },
    });
    await expect(apiFetch("/draf")).rejects.toBeInstanceOf(ApiError);
  });
});
