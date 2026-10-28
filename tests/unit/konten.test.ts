// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { BATAS_FOTO_HERO, ambilJurusanAdmin, buatKonten, daftarKonten, hapusKonten, ubahJurusan, ubahKonten } from "@/server/actions/konten";
import { ambilSemuaPengaturan, simpanPengaturanAdmin } from "@/server/actions/pengaturan";
import { ambilBerita, ambilDaftarBerita, ambilJurusanPublik } from "@/server/actions/ambilPublik";
import { prisma } from "@/server/db/client";
import { GalatApi } from "@/server/types/galat";
import { seedReferensi } from "../../prisma/seed-lib";

const ctx = { userId: "1", ip: "127.0.0.1" };

async function bersih() {
  await prisma.auditLog.deleteMany();
  await prisma.berita.deleteMany();
  await prisma.event.deleteMany();
  await prisma.galeri.deleteMany();
  await prisma.fotoHero.deleteMany();
  await prisma.testimoni.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.pengaturan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.user.create({ data: { id: BigInt(1), name: "Uji", username: "uji", passwordHash: "x", peran: "superadmin" } });
}

beforeEach(bersih);
afterAll(async () => {
  await bersih();
  await prisma.user.deleteMany();
  await prisma.bobotJurusan.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.jurusan.deleteMany();
  await prisma.$disconnect();
});

const galat = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error("Seharusnya melempar galat.");
};

describe("berita", () => {
  it("HTML disanitasi: script, event handler, dan javascript: dibuang, tag aman tetap", async () => {
    const hasil = (await buatKonten(
      "berita",
      {
        judul: "Pendaftaran dibuka",
        isi: '<p onclick="x()">Halo <strong>dunia</strong></p><script>alert(1)</script><a href="javascript:alert(1)">jahat</a><img src=x onerror=alert(1)><a href="https://sekolah.sch.id">aman</a>',
        isActive: true,
      },
      ctx,
    )) as { isi: string };

    expect(hasil.isi).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(hasil.isi).toContain("<strong>dunia</strong>");
    expect(hasil.isi).toContain('href="https://sekolah.sch.id"');
    expect(hasil.isi).toContain("noopener noreferrer");
  });

  it("slug dibuat dari judul dan dijamin unik", async () => {
    const a = (await buatKonten("berita", { judul: "Juara Lomba LKS 2026!", isi: "x", isActive: true }, ctx)) as { slug: string };
    const b = (await buatKonten("berita", { judul: "Juara Lomba LKS 2026!", isi: "y", isActive: true }, ctx)) as { slug: string };
    expect(a.slug).toBe("juara-lomba-lks-2026");
    expect(b.slug).toBe("juara-lomba-lks-2026-2");
  });

  it("slug tetap saat judul diedit, supaya tautan lama hidup", async () => {
    const a = (await buatKonten("berita", { judul: "Judul Lama", isi: "x", isActive: true }, ctx)) as { id: string; slug: string };
    const b = (await ubahKonten("berita", a.id, { judul: "Judul Baru Sekali", isi: "x", isActive: true }, ctx)) as { slug: string; judul: string };
    expect(b.judul).toBe("Judul Baru Sekali");
    expect(b.slug).toBe(a.slug);
  });

  it("berita nonaktif atau belum terbit tidak tampil di publik; aktif tampil dan bisa dibuka lewat slug", async () => {
    await buatKonten("berita", { judul: "Aktif Terbit", isi: "<p>isi</p>", isActive: true }, ctx);
    await buatKonten("berita", { judul: "Nonaktif Saja", isi: "x", isActive: false }, ctx);
    await buatKonten("berita", { judul: "Terbit Besok", isi: "x", isActive: true, publishedAt: new Date(Date.now() + 86_400_000) }, ctx);

    const publik = await ambilDaftarBerita();
    expect(publik.map((b) => b.judul)).toEqual(["Aktif Terbit"]);
    expect(await ambilBerita("aktif-terbit")).not.toBeNull();
    expect(await ambilBerita("nonaktif-saja")).toBeNull();
    expect(await ambilBerita("terbit-besok")).toBeNull();
  });

  it("validasi: judul terlalu pendek ditolak dengan galat per field; alamat gambar berbahaya ditolak", async () => {
    const e1 = await galat(buatKonten("berita", { judul: "ab", isi: "x" }, ctx));
    expect(e1).toBeDefined();
    const e2 = await galat(buatKonten("berita", { judul: "Judul sah", isi: "x", gambar: "javascript:alert(1)" }, ctx));
    expect(e2).toBeDefined();
  });

  it("buat, ubah, dan hapus tercatat di audit log", async () => {
    const a = (await buatKonten("berita", { judul: "Catatan audit", isi: "x", isActive: true }, ctx)) as { id: string };
    await ubahKonten("berita", a.id, { judul: "Catatan audit 2", isi: "x", isActive: true }, ctx);
    await hapusKonten("berita", a.id, ctx);

    const aksi = (await prisma.auditLog.findMany({ orderBy: { id: "asc" } })).map((x) => x.aksi);
    expect(aksi).toEqual(["berita.buat", "berita.ubah", "berita.hapus"]);
  });

  it("ID tidak valid atau tidak ada menghasilkan 404", async () => {
    expect(((await galat(hapusKonten("berita", "999999", ctx))) as GalatApi).status).toBe(404);
    expect(((await galat(hapusKonten("berita", "bukan-angka", ctx))) as GalatApi).status).toBe(404);
  });
});

describe("entitas lain", () => {
  it("FAQ: kata kunci teks dipisah koma diubah jadi array huruf kecil", async () => {
    const f = (await buatKonten("faq", { pertanyaan: "Apa syaratnya?", jawaban: "Lihat halaman persyaratan.", keywords: " Syarat, BERKAS ,, rapor " }, ctx)) as { keywords: string[] };
    expect(f.keywords).toEqual(["syarat", "berkas", "rapor"]);
  });

  it("galeri wajib gambar; testimoni wajib isi", async () => {
    expect(await galat(buatKonten("galeri", { judul: "tanpa gambar" }, ctx))).toBeDefined();
    expect(await galat(buatKonten("testimoni", { nama: "Rina" }, ctx))).toBeDefined();
  });

  it("foto tambahan hero: wajib gambar, urut sesuai urutan, dan dibatasi jumlahnya", async () => {
    expect(await galat(buatKonten("hero", { judul: "tanpa gambar" }, ctx))).toBeDefined();
    await buatKonten("hero", { judul: "Kedua", gambar: "/images/h2.webp", urutan: 2 }, ctx);
    await buatKonten("hero", { judul: "Pertama", gambar: "/images/h1.webp", urutan: 1 }, ctx);
    const urut = (await daftarKonten("hero")).data as { judul: string }[];
    expect(urut.map((h) => h.judul)).toEqual(["Pertama", "Kedua"]);

    for (let i = 3; i <= BATAS_FOTO_HERO; i++) await buatKonten("hero", { gambar: `/images/h${i}.webp`, urutan: i }, ctx);
    const galatBatas = (await galat(buatKonten("hero", { gambar: "/images/lagi.webp" }, ctx))) as GalatApi;
    expect(galatBatas.errors?.gambar?.[0]).toMatch(/maksimal 6/);
    expect((await daftarKonten("hero")).total).toBe(BATAS_FOTO_HERO);
  });

  it("daftar mendukung pencarian tanpa peka huruf dan paginasi", async () => {
    for (const j of ["Kunjungan industri", "Lomba LKS", "Libur semester"]) await buatKonten("event", { judul: j, tanggal: "2027-01-10", isActive: true }, ctx);
    const cari = await daftarKonten("event", { q: "lks" });
    expect(cari.total).toBe(1);
    const hal = await daftarKonten("event", { per: 2, halaman: 2 });
    expect(hal.data).toHaveLength(1);
    expect(hal.total).toBe(3);
  });
});

describe("jurusan dan pengaturan", () => {
  it("ubah jurusan: kuota di luar 0-1000 ditolak, kode tidak berubah, audit tercatat", async () => {
    await seedReferensi(prisma);
    const j = (await ambilJurusanAdmin("akl")) as { nama: string };

    expect(await galat(ubahJurusan("AKL", { nama: j.nama, kuota: 1001, prospekKarir: [], keunggulan: [] }, ctx))).toBeDefined();

    const baru = (await ubahJurusan("akl", { nama: j.nama, kuota: 80, prospekKarir: "Akuntan\nKasir", keunggulan: [], isActive: true }, ctx)) as { kode: string; kuota: number; prospekKarir: string[] };
    expect(baru.kode).toBe("AKL");
    expect(baru.kuota).toBe(80);
    expect(baru.prospekKarir).toEqual(["Akuntan", "Kasir"]);
    expect((await prisma.auditLog.findFirst({ where: { aksi: "jurusan.ubah" } }))?.entitasId).toBe("AKL");
  });

  it("jurusan nonaktif hilang dari halaman publik (404)", async () => {
    await seedReferensi(prisma);
    const j = (await ambilJurusanAdmin("TKR")) as { nama: string; kuota: number };
    expect(await ambilJurusanPublik("tkr")).not.toBeNull();

    await ubahJurusan("TKR", { nama: j.nama, kuota: j.kuota, prospekKarir: [], keunggulan: [], isActive: false }, ctx);

    expect(await ambilJurusanPublik("TKR")).toBeNull();
  });

  it("pengaturan: tahun ajaran harus 2027/2028, kunci tak dikenal ditolak, hanya yang berubah diaudit", async () => {
    expect(await galat(simpanPengaturanAdmin({ tahun_ajaran: "2027-2028" }, ctx))).toBeDefined();
    expect(await galat(simpanPengaturanAdmin({ google_drive_refresh_token: "x" }, ctx))).toBeDefined();

    await simpanPengaturanAdmin({ tahun_ajaran: "2027/2028", kontak_panitia: "Telp (0281) 513425" }, ctx);
    expect((await ambilSemuaPengaturan()).tahun_ajaran).toBe("2027/2028");

    const sebelum = await prisma.auditLog.count();
    await simpanPengaturanAdmin({ tahun_ajaran: "2027/2028" }, ctx); // tanpa perubahan
    expect(await prisma.auditLog.count()).toBe(sebelum);
  });
});
