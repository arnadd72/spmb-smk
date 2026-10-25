import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PenampilBerkas, type BerkasTampil } from "@/features/admin/verifikasi/penampil-berkas";

const buat = (kunci: string, label: string, mime = "image/jpeg"): BerkasTampil => ({ kunci, indeks: 0, label, nama: `${kunci}.jpg`, mime, ukuran: 1000, sumber: "drive" });
const BERKAS = [buat("kk", "Kartu keluarga"), buat("akta", "Akta kelahiran"), buat("pas_foto", "Pas foto")];

const penanda = () => screen.queryByRole("status", { name: "Memuat berkas" });
const gambar = (label: string) => screen.getByRole("img", { name: new RegExp(label) });

afterEach(cleanup);

describe("PenampilBerkas: indikator memuat", () => {
  it("tampil sampai gambar pertama selesai dimuat", () => {
    render(<PenampilBerkas id="1" berkas={BERKAS} />);
    expect(penanda()).not.toBeNull();
    fireEvent.load(gambar("Kartu keluarga"));
    expect(penanda()).toBeNull();
  });

  it("muncul lagi saat pindah tab ke berkas lain dan hilang setelah berkas itu dimuat", () => {
    render(<PenampilBerkas id="1" berkas={BERKAS} />);
    fireEvent.load(gambar("Kartu keluarga"));
    expect(penanda()).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Akta kelahiran" }));
    expect(penanda()).not.toBeNull();
    fireEvent.load(gambar("Akta kelahiran"));
    expect(penanda()).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Pas foto" }));
    expect(penanda()).not.toBeNull();
    fireEvent.load(gambar("Pas foto"));
    expect(penanda()).toBeNull();
  });

  it("kembali ke tab yang sudah pernah dimuat tetap menampilkan indikator sampai gambarnya selesai lagi", () => {
    render(<PenampilBerkas id="1" berkas={BERKAS} />);
    fireEvent.load(gambar("Kartu keluarga"));
    fireEvent.click(screen.getByRole("tab", { name: "Akta kelahiran" }));
    fireEvent.load(gambar("Akta kelahiran"));
    fireEvent.click(screen.getByRole("tab", { name: "Kartu keluarga" }));
    expect(penanda()).not.toBeNull();
    fireEvent.load(gambar("Kartu keluarga"));
    expect(penanda()).toBeNull();
  });

  it("gambar yang gagal dimuat menghentikan indikator dan menampilkan pesan, bukan berputar selamanya", () => {
    render(<PenampilBerkas id="1" berkas={BERKAS} />);
    fireEvent.error(gambar("Kartu keluarga"));
    expect(penanda()).toBeNull();
    expect(screen.getByText(/Berkas gagal dimuat/)).not.toBeNull();
  });

  it("berkas yang tidak tersedia tidak menampilkan indikator", () => {
    render(<PenampilBerkas id="1" berkas={[{ ...BERKAS[0], sumber: "hilang" }]} />);
    expect(penanda()).toBeNull();
  });
});
