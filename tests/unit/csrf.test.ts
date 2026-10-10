// @vitest-environment node
import { describe, expect, it } from "vitest";
import { periksaOrigin } from "@/server/auth/csrf";
import { GalatApi } from "@/server/types/galat";

const req = (method: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/v1/admin/login", { method, headers });

describe("periksaOrigin (CSRF)", () => {
  it("GET selalu lolos", () => {
    expect(() => periksaOrigin(req("GET", { "sec-fetch-site": "cross-site" }))).not.toThrow();
  });

  it("POST same-origin lolos", () => {
    expect(() => periksaOrigin(req("POST", { "sec-fetch-site": "same-origin" }))).not.toThrow();
  });

  it("POST cross-site ditolak 403", () => {
    try {
      periksaOrigin(req("POST", { "sec-fetch-site": "cross-site" }));
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(GalatApi);
      expect((e as GalatApi).status).toBe(403);
    }
  });

  it("tanpa Sec-Fetch-Site: Origin harus sama dengan Host", () => {
    expect(() => periksaOrigin(req("POST", { origin: "http://localhost:3000", host: "localhost:3000" }))).not.toThrow();
    expect(() => periksaOrigin(req("POST", { origin: "https://jahat.example", host: "localhost:3000" }))).toThrow(GalatApi);
  });
});
