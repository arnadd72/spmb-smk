import { describe, expect, it } from "vitest";
import { menuUntuk } from "@/components/layout/menu-admin";

const href = (peran: "superadmin" | "panitia" | "konten") => menuUntuk(peran).flatMap((g) => g.item.map((i) => i.href));

describe("menu Tes Minat Bakat (PRD 1.3 butir 80)", () => {
  it("tampil untuk operator konten dan superadmin, tidak untuk panitia", () => {
    expect(href("konten")).toContain("/admin/tes-minat-bakat");
    expect(href("superadmin")).toContain("/admin/tes-minat-bakat");
    expect(href("panitia")).not.toContain("/admin/tes-minat-bakat");
  });
});
