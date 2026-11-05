import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// PRD 1.3 butir 86: tombol Masuk terkunci sampai captcha lolos; tanpa site key form berjalan seperti sebelumnya.
const { apiFetch, keluaranToken, jumlahUlang } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  keluaranToken: { kirim: undefined as undefined | ((t: string | undefined) => void) },
  jumlahUlang: { nilai: 0 },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api-client", async (asli) => ({ ...(await asli<typeof import("@/lib/api-client")>()), apiFetch }));
vi.mock("@/features/admin/auth/captcha-turnstile", () => ({
  CaptchaTurnstile: ({ onToken, ulang }: { onToken: (t: string | undefined) => void; ulang: number }) => {
    keluaranToken.kirim = onToken;
    jumlahUlang.nilai = ulang;
    return <div data-testid="captcha" />;
  },
}));

import { ApiError } from "@/lib/api-client";
import { FormLogin } from "@/features/admin/auth/form-login";

function isi() {
  fireEvent.change(screen.getByLabelText(/Username/), { target: { value: "budi" } });
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: "rahasia" } });
}

beforeEach(() => {
  apiFetch.mockReset();
  keluaranToken.kirim = undefined;
  jumlahUlang.nilai = 0;
});
afterEach(cleanup);

describe("FormLogin dengan captcha", () => {
  it("tanpa site key: tidak ada captcha, tombol Masuk aktif, body tanpa captchaToken", async () => {
    apiFetch.mockResolvedValue({});
    render(<FormLogin />);
    expect(screen.queryByTestId("captcha")).toBeNull();
    isi();
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ username: "budi", password: "rahasia" });
  });

  it("dengan site key: tombol terkunci sampai captcha lolos, lalu token ikut terkirim", async () => {
    apiFetch.mockResolvedValue({});
    render(<FormLogin siteKey="site-uji" />);
    expect(screen.getByTestId("captcha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selesaikan captcha dulu" })).toBeDisabled();

    act(() => keluaranToken.kirim?.("token-baik"));
    isi();
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    expect(JSON.parse(apiFetch.mock.calls[0][1].body).captchaToken).toBe("token-baik");
  });

  it("login gagal menampilkan pesan dan meminta captcha baru", async () => {
    apiFetch.mockRejectedValue(new ApiError(401, "INVALID_CREDENTIALS", "Username atau password salah."));
    render(<FormLogin siteKey="site-uji" />);
    act(() => keluaranToken.kirim?.("token-baik"));
    isi();
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Username atau password salah.");
    expect(jumlahUlang.nilai).toBe(1);
  });
});
