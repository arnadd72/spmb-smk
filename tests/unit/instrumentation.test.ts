// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { autoSelect, urutan } = vi.hoisted(() => ({ autoSelect: vi.fn(), urutan: vi.fn() }));
vi.mock("node:net", () => ({ setDefaultAutoSelectFamily: autoSelect }));
vi.mock("node:dns", () => ({ setDefaultResultOrder: urutan }));

import { register } from "@/instrumentation";

// PRD v4 butir 84: hosting Jagoan tanpa IPv6 keluar, jadi IPv4 diutamakan dan autoSelectFamily dimatikan.
describe("instrumentation register", () => {
  const env = { ...process.env };

  beforeEach(() => {
    autoSelect.mockClear();
    urutan.mockClear();
    delete process.env.VERCEL;
    process.env.NEXT_RUNTIME = "nodejs";
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("mematikan autoSelectFamily dan mengutamakan IPv4 di runtime Node (hosting)", async () => {
    await register();
    expect(autoSelect).toHaveBeenCalledWith(false);
    expect(urutan).toHaveBeenCalledWith("ipv4first");
  });

  it("tidak mengubah apa pun di Vercel", async () => {
    process.env.VERCEL = "1";
    await register();
    expect(autoSelect).not.toHaveBeenCalled();
    expect(urutan).not.toHaveBeenCalled();
  });

  it("tidak mengubah apa pun di runtime selain Node", async () => {
    process.env.NEXT_RUNTIME = "edge";
    await register();
    expect(autoSelect).not.toHaveBeenCalled();
    expect(urutan).not.toHaveBeenCalled();
  });
});
