// @vitest-environment node
import { existsSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buatKonten, hapusKonten, ubahKonten } from "@/server/actions/konten";
import { prisma } from "@/server/db/client";
import { hapusMediaBila, simpanMedia } from "@/server/services/media";
import { simpanPengaturan } from "@/server/services/pengaturan";
import { ambilDataLanding } from "@/server/actions/ambilLanding";
import type { GalatApi } from "@/server/types/galat";
import { seedFormField, seedReferensi } from "../../prisma/seed-lib";
import { GET as getBerita } from "@/app/api/v1/berita/route";
import { GET as getBeritaSlug } from "@/app/api/v1/berita/[slug]/route";
import { GET as getFaq } from "@/app/api/v1/faq/route";
import { GET as getFormSchema } from "@/app/api/v1/form-schema/route";
import { GET as getJurusan } from "@/app/api/v1/jurusan/route";
import { GET as getJurusanKode } from "@/app/api/v1/jurusan/[kode]/route";
import { GET as getLanding } from "@/app/api/v1/landing/route";

const ctx = { userId: "1", ip: "127.0.0.1" };
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 9)]);
const req = (u = "http://localhost/x") => new Request(u);
// Beberapa handler tidak memakai argumen; di test semuanya dipanggil seragam dengan Request.
const H = (h: unknown) => h as (r: Request, c?: unknown) => Promise<Response>;
const ke = (url: string) => path.join(process.cwd(), "public", url);
const yangDibuat: string[] = [];

async function bersih() {
  await prisma.berita.deleteMany();
  await prisma.event.deleteMany();
  await prisma.galeri.deleteMany();
  await prisma.fotoHero.deleteMany();
  await prisma.testimoni.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.pengaturan.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.user.deleteMany();
}

beforeAll(async () => {
  await seedReferensi(prisma);
});
beforeEach(async () => {
  await bersih();
  await prisma.user.create({ data: { id: BigInt(1), name: "Konten", username: "konten", passwordHash: "x", peran: "konten" } });
  await seedFormField(prisma);
});
afterAll(async () => {
  for (const u of yangDibuat) await hapusMediaBila(u);
  await bersih();
  await prisma.bobotJurusan.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.jurusan.deleteMany();
  await prisma.$disconnect();
});

const galat = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as GalatApi;
  }
  throw new Error("Seharusnya melempar galat.");
};
const json = async (r: Response) => (await r.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("landing menampilkan konten dari database", () => {
  it("hanya yang aktif dan sudah terbit; urutan dan batas mengikuti aturan", async () => {
    await buatKonten("berita", { judul: "Berita tayang", isi: "<p>isi</p>", isActive: true, publishedAt: new Date(Date.now() - 1000) }, ctx);
    await buatKonten("berita", { judul: "Berita tersembunyi", isi: "<p>x</p>", isActive: false }, ctx);
    await buatKonten("berita", { judul: "Berita terjadwal", isi: "<p>x</p>", isActive: true, publishedAt: new Date(Date.now() + 86400_000) }, ctx);
    await buatKonten("event", { judul: "Agenda depan", tanggal: new Date(Date.now() + 86400_000), isActive: true }, ctx);
    await buatKonten("event", { judul: "Agenda lewat", tanggal: new Date(Date.now() - 86400_000), isActive: true }, ctx);
    for (let i = 0; i < 7; i++) await buatKonten("galeri", { judul: `Foto ${i}`, gambar: `/images/f${i}.webp`, urutan: i, isActive: i !== 2 }, ctx);
    await buatKonten("testimoni", { nama: "Alumni A", isi: "Bagus sekali", urutan: 1, isActive: true }, ctx);
    await buatKonten("testimoni", { nama: "Alumni B", isi: "Disembunyikan", urutan: 2, isActive: false }, ctx);

    const d = await ambilDataLanding();
    expect(d.berita.map((b) => b.judul)).toEqual(["Berita tayang"]);
    expect(d.agenda.map((a) => a.judul)).toEqual(["Agenda depan"]);
    expect(d.galeri).toHaveLength(6);
    expect(d.galeri.map((g) => g.judul)).not.toContain("Foto 2");
    expect(d.testimoni.map((t) => t.nama)).toEqual(["Alumni A"]);
    expect(d.jurusan).toHaveLength(4);
  });

  it("foto tambahan hero: hanya yang aktif, urut sesuai urutan", async () => {
    await buatKonten("hero", { judul: "Kedua", gambar: "/images/h2.webp", urutan: 2, isActive: true }, ctx);
    await buatKonten("hero", { judul: "Pertama", gambar: "/images/h1.webp", urutan: 1, isActive: true }, ctx);
    await buatKonten("hero", { judul: "Disembunyikan", gambar: "/images/h3.webp", urutan: 3, isActive: false }, ctx);
    expect((await ambilDataLanding()).heroTambahan.map((h) => h.judul)).toEqual(["Pertama", "Kedua"]);
  });

  it("agenda hari ini tetap tampil walau jamnya sudah lewat; kemarin tidak", async () => {
    const hari = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    await buatKonten("event", { judul: "Agenda pagi tadi", tanggal: new Date(`${hari}T00:05:00+07:00`), isActive: true }, ctx);
    await buatKonten("event", { judul: "Agenda kemarin", tanggal: new Date(new Date(`${hari}T00:00:00+07:00`).getTime() - 3600_000), isActive: true }, ctx);
    expect((await ambilDataLanding()).agenda.map((a) => a.judul)).toEqual(["Agenda pagi tadi"]);
  });

  it("tanpa konten semua bagian kosong (bagian disembunyikan di halaman), tanpa error", async () => {
    const d = await ambilDataLanding();
    expect([d.berita, d.agenda, d.galeri, d.heroTambahan, d.testimoni].every((x) => x.length === 0)).toBe(true);
  });
});

describe("API publik JSON", () => {
  it("landing, jurusan, dan berita mengembalikan data aktif dengan header cache publik", async () => {
    await buatKonten("berita", { judul: "Halo Dunia", isi: "<p>isi <script>x</script></p>", isActive: true, publishedAt: new Date(Date.now() - 1000) }, ctx);
    await buatKonten("berita", { judul: "Rahasia", isi: "<p>x</p>", isActive: false }, ctx);

    const landing = await H(getLanding)(req());
    expect(landing.status).toBe(200);
    expect(landing.headers.get("cache-control")).toMatch(/public, s-maxage=/);
    expect((await json(landing)).jurusan).toHaveLength(4);

    const daftar = await json(await getBerita(req("http://localhost/api/v1/berita?batas=1")));
    expect(daftar.data.map((b: { judul: string }) => b.judul)).toEqual(["Halo Dunia"]);
    const slug = daftar.data[0].slug as string;
    const satu = await json(await getBeritaSlug(req(), { params: Promise.resolve({ slug }) }));
    expect(satu.data.isiHtml).not.toContain("<script>");
    expect((await getBeritaSlug(req(), { params: Promise.resolve({ slug: "tidak-ada" }) })).status).toBe(404);

    const j = await json(await H(getJurusan)(req()));
    expect(j.data.map((x: { kode: string }) => x.kode)).toEqual(["AKL", "MPLB", "LPK3", "TKR"]);
    expect((await getJurusanKode(req(), { params: Promise.resolve({ kode: "akl" }) })).status).toBe(200);
    expect((await getJurusanKode(req(), { params: Promise.resolve({ kode: "ZZZ" }) })).status).toBe(404);
  });

  it("berita nonaktif atau terjadwal tidak bisa dibuka lewat slug", async () => {
    const b = (await buatKonten("berita", { judul: "Tersembunyi", isi: "<p>x</p>", isActive: false }, ctx)) as { slug: string };
    expect((await getBeritaSlug(req(), { params: Promise.resolve({ slug: b.slug }) })).status).toBe(404);
  });

  it("FAQ tidak membocorkan kata kunci internal", async () => {
    await prisma.faq.create({ data: { pertanyaan: "Kapan buka?", jawaban: "Segera.", keywords: ["rahasia-internal"], urutan: 1, isActive: true } });
    await prisma.faq.create({ data: { pertanyaan: "Nonaktif?", jawaban: "x", keywords: [], urutan: 2, isActive: false } });
    const faq = await H(getFaq)(req());
    const teks = JSON.stringify(await json(faq));
    expect(teks).toContain("Kapan buka?");
    expect(teks).not.toContain("rahasia-internal");
    expect(teks).not.toContain("Nonaktif?");
  });

  it("form-schema memuat isian yang tampil per langkah dan mengikuti pengaturan jadwal", async () => {
    await simpanPengaturan("tahun_ajaran", "2027/2028");
    await simpanPengaturan("gelombang_tutup", "2000-01-01");
    const s = await json(await H(getFormSchema)(req()));
    expect(s.tahunAjaran).toBe("2027/2028");
    expect(s.status).toBe("tutup");
    expect(s.langkah).toHaveLength(8);
    const kunci = s.langkah.flatMap((l: { field: { kunci: string }[] }) => l.field.map((f) => f.kunci));
    expect(kunci).toContain("nik");
    expect(kunci).not.toContain("no_ijazah");
    expect(kunci).not.toContain("ijazah_nomor_tahun");
    const j1 = s.langkah[3].field.find((f: { kunci: string }) => f.kunci === "jurusan_1");
    expect(j1.opsi.map((o: { nilai: string }) => o.nilai)).toContain("AKL");
    const referensi = s.langkah[4].field.find((f: { kunci: string }) => f.kunci === "referensi_pendaftar");
    expect(referensi.opsi.map((o: { nilai: string }) => o.nilai)).toEqual([
      "Teman/saudara/keluarga",
      "Sosmed",
      "Alumni",
      "Sosialisasi SPMB",
      "Lainnya (tulis sendiri)",
    ]);
    expect(referensi.wajib).toBe(true);
    expect(s.langkah[0].field[0]).not.toHaveProperty("id");
  });
});

describe("unggah gambar konten", () => {
  it("menyimpan JPG/PNG/WebP, menolak PDF, HTML bertopeng gambar, kosong, dan lebih dari 5 MB", async () => {
    const url = await simpanMedia(PNG);
    yangDibuat.push(url);
    expect(url).toMatch(/^\/uploads\/konten\/\d{4}\/\d{2}\/[\w-]+\.png$/);
    expect(existsSync(ke(url))).toBe(true);

    for (const isi of [Buffer.from("%PDF-1.4 ".padEnd(40, "x")), Buffer.from("<html><script>alert(1)</script>".padEnd(40, " ")), Buffer.alloc(0), Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)])]) {
      expect((await galat(simpanMedia(isi))).status).toBe(422);
    }
  });

  it("hapusMediaBila hanya menghapus gambar hasil unggah, tidak menyentuh alamat luar atau path di luar folder", async () => {
    const url = await simpanMedia(PNG);
    await hapusMediaBila("https://contoh.com/gambar.png");
    await hapusMediaBila("/images/sekolah/p5-karya.webp");
    await hapusMediaBila("/uploads/konten/../../../package.json");
    expect(existsSync(path.join(process.cwd(), "package.json"))).toBe(true);
    expect(existsSync(ke("/images/sekolah/p5-karya.webp"))).toBe(true);
    await hapusMediaBila(url);
    expect(existsSync(ke(url))).toBe(false);
    await hapusMediaBila(url); // sudah hilang: tidak melempar
  });

  it("gambar lama ikut terhapus saat diganti atau barisnya dihapus", async () => {
    const lama = await simpanMedia(PNG);
    const baru = await simpanMedia(PNG);
    yangDibuat.push(lama, baru);
    const g = (await buatKonten("galeri", { judul: "Foto", gambar: lama, urutan: 1, isActive: true }, ctx)) as { id: string };

    await ubahKonten("galeri", g.id, { judul: "Foto", gambar: baru, urutan: 1, isActive: true }, ctx);
    expect(existsSync(ke(lama))).toBe(false);
    expect(existsSync(ke(baru))).toBe(true);

    await hapusKonten("galeri", g.id, ctx);
    expect(existsSync(ke(baru))).toBe(false);
  });
});
