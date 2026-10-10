"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge, BadgeKeyakinan, BadgeStatus } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton, SkeletonProses } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { PageTransition } from "@/components/motion/page-transition";
import { Reveal } from "@/components/motion/reveal";
import { StaggerList } from "@/components/motion/stagger-list";

const warna: Array<{ nama: string; token: string; kelas: string; catatan: string }> = [
  { nama: "Hijau NU", token: "primer #057A3C", kelas: "bg-primer", catatan: "Tombol utama, tautan, penanda aktif" },
  { nama: "Hijau tua", token: "primer-tua #03452A", kelas: "bg-hijau-tua", catatan: "Judul di atas terang" },
  { nama: "Hijau gelap", token: "hijau-gelap #0E1F17", kelas: "bg-hijau-gelap", catatan: "Footer, latar gelap" },
  { nama: "Kertas", token: "latar #F6F3EC", kelas: "bg-latar border border-garis", catatan: "Latar halaman" },
  { nama: "Garis", token: "permukaan-alt #E9E4D8", kelas: "bg-permukaan-alt", catatan: "Garis dan permukaan" },
  { nama: "Emas kunyit", token: "aksen #D9A21B", kelas: "bg-aksen", catatan: "Satu elemen penting per layar" },
];

const status: Array<{ nama: string; kelas: string }> = [
  { nama: "Sukses", kelas: "bg-sukses-latar text-sukses" },
  { nama: "Info", kelas: "bg-info-latar text-info" },
  { nama: "Peringatan", kelas: "bg-peringatan-latar text-peringatan" },
  { nama: "Bahaya", kelas: "bg-bahaya-latar text-bahaya" },
];

function Bagian({ judul, catatan, children }: { judul: string; catatan?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-garis pt-8">
      <div>
        <h2 className="text-2xl font-bold text-primer-tua">{judul}</h2>
        {catatan && <p className="mt-1 max-w-2xl text-tinta-redup">{catatan}</p>}
      </div>
      {children}
    </section>
  );
}

const jurusanOpsi = [
  { nilai: "AKL", label: "Akuntansi dan Keuangan Lembaga" },
  { nilai: "MPLB", label: "Manajemen Perkantoran dan Layanan Bisnis" },
  { nilai: "FKK", label: "Farmasi Klinis dan Komunitas" },
  { nilai: "TKR", label: "Teknik Kendaraan Ringan" },
];

type JurusanSeed = {
  kode: string;
  nama: string;
  kuota: number;
  totalBobot: number;
  bobot: { mapel: string; kode: string; bobot: number }[];
};

export function Katalog({ jurusan }: { jurusan: JurusanSeed[] }) {
  const [dialog, setDialog] = useState(false);
  const [langkah, setLangkah] = useState(3);
  const [jurusanDipilih, setJurusanDipilih] = useState<string>();
  const [memuat, setMemuat] = useState(false);

  function simulasiMuat() {
    setMemuat(true);
    setTimeout(() => setMemuat(false), 1500);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 pb-16">
      <header>
        <h1 className="text-4xl font-extrabold text-primer-tua sm:text-5xl">Katalog komponen</h1>
        <p className="mt-3 max-w-2xl text-lg text-tinta-redup">
          Token dan komponen dasar SPMB. Halaman ini hanya tampil di lingkungan lokal.
        </p>
      </header>

      <Bagian judul="Warna" catatan="Token semantik di @theme. Komponen memakai nama token, bukan hex.">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {warna.map((w) => (
            <li key={w.nama} className="overflow-hidden rounded-kartu border border-garis bg-permukaan">
              <div className={`h-20 ${w.kelas}`} />
              <div className="p-3">
                <p className="font-bold text-tinta">{w.nama}</p>
                <p className="angka text-sm text-tinta-redup">{w.token}</p>
                <p className="mt-1 text-sm text-tinta-redup">{w.catatan}</p>
              </div>
            </li>
          ))}
        </ul>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {status.map((s) => (
            <li key={s.nama} className={`rounded-kontrol px-3 py-3 font-semibold ${s.kelas}`}>
              {s.nama}
            </li>
          ))}
        </ul>
      </Bagian>

      <Bagian judul="Tipografi" catatan="Clash Display untuk judul dan angka besar, Satoshi untuk isi.">
        <div className="flex flex-col gap-3">
          <p className="font-display text-5xl font-extrabold text-primer-tua sm:text-6xl">AKL MPLB FKK TKR</p>
          <h3 className="text-3xl font-bold">Belajar terampil, tumbuh berakhlak</h3>
          <p className="max-w-2xl text-base leading-relaxed">
            Isi paragraf memakai Satoshi 16 px dengan tinggi baris 1,5. Pendaftaran dibuka sesuai jadwal gelombang dan
            ditutup otomatis di luar jadwal.
          </p>
          <p className="text-sm text-tinta-redup">Teks bantuan 14 px, abu hijau.</p>
          <table className="w-full max-w-md border-collapse text-left">
            <thead>
              <tr className="border-b border-garis text-sm text-tinta-redup">
                <th className="py-2 font-semibold">Jurusan</th>
                <th className="py-2 text-right font-semibold">Skor</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["AKL", "84,1"],
                ["MPLB", "79,4"],
                ["FKK", "75,0"],
              ].map(([k, s]) => (
                <tr key={k} className="border-b border-garis">
                  <td className="py-2 font-semibold">{k}</td>
                  <td className="py-2 text-right">{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bagian>

      <Bagian judul="Tombol" catatan="Tinggi minimal 44 px. Emas hanya satu per layar. Penuh lebar di mobile lewat penuhMobile.">
        <div className="flex flex-wrap gap-3">
          <Button>Simpan</Button>
          <Button varian="aksen">Daftar Sekarang</Button>
          <Button varian="sekunder">Kembali</Button>
          <Button varian="hantu">Batal</Button>
          <Button varian="bahaya">Tolak</Button>
          <Button disabled>Nonaktif</Button>
          <Button memuat={memuat} onClick={simulasiMuat}>
            {memuat ? "Menyimpan" : "Uji memuat"}
          </Button>
        </div>
        <Button ukuran="lg" penuhMobile className="sm:self-start">
          Lanjut ke langkah berikutnya
        </Button>
      </Bagian>

      <Bagian judul="Formulir" catatan="Label di atas, bantuan di bawah, galat dekat field dan terhubung lewat aria-describedby.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nama lengkap" wajib bantuan="Sesuai akta kelahiran.">
            <Input autoComplete="name" />
          </Field>
          <Field label="NISN" wajib galat="NISN harus 10 digit.">
            <Input inputMode="numeric" defaultValue="12345" />
          </Field>
          <Field label="Jurusan pilihan 1" wajib>
            <Select opsi={jurusanOpsi} nilai={jurusanDipilih} onChange={setJurusanDipilih} />
          </Field>
          <Field label="Nomor HP" bantuan="Opsional.">
            <Input type="tel" inputMode="numeric" disabled defaultValue="081234567890" />
          </Field>
          <Field label="Catatan tambahan" className="md:col-span-2">
            <Textarea />
          </Field>
        </div>
      </Bagian>

      <Bagian judul="Unggah berkas" catatan="Kamera belakang di HP, batas 5 MB, galat ukuran terbaca pembaca layar.">
        <div className="grid gap-5 md:grid-cols-2">
          <FileDrop label="Akta kelahiran" kamera />
          <FileDrop label="Kartu keluarga" galat="Berkas tidak terbaca. Unggah ulang atau isi manual." />
        </div>
      </Bagian>

      <Bagian judul="Lencana" catatan="Selalu ikon dan teks, tidak hanya warna.">
        <div className="flex flex-wrap gap-3">
          <BadgeStatus status="pending" />
          <BadgeStatus status="approved" />
          <BadgeStatus status="revision" />
          <BadgeStatus status="rejected" />
        </div>
        <div className="flex flex-wrap gap-3">
          <BadgeKeyakinan level="HIGH" />
          <BadgeKeyakinan level="MEDIUM" />
          <Badge>Dari dokumen</Badge>
        </div>
      </Bagian>

      <Bagian judul="Stepper" catatan="Menempel di atas pada mobile. Ubah langkah untuk melihat progres.">
        <div className="overflow-hidden rounded-kartu border border-garis">
          <Stepper langkah={langkah} total={8} nama="Rapor dan nilai" />
        </div>
        <div className="flex gap-2">
          <Button varian="sekunder" onClick={() => setLangkah((l) => Math.max(1, l - 1))}>
            Mundur
          </Button>
          <Button varian="sekunder" onClick={() => setLangkah((l) => Math.min(8, l + 1))}>
            Maju
          </Button>
        </div>
      </Bagian>

      <Bagian judul="Dialog dan kartu">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h3 className="text-xl font-bold">Kartu</h3>
            <p className="mt-2 text-tinta-redup">Satu bayangan tipis, radius 14 px. Dipakai hanya bila elevasi bermakna.</p>
          </Card>
          <Card className="flex flex-col items-start gap-3">
            <h3 className="text-xl font-bold">Konfirmasi tindakan</h3>
            <Button varian="sekunder" onClick={() => setDialog(true)}>
              Buka dialog
            </Button>
          </Card>
        </div>
        <Dialog
          buka={dialog}
          onBukaChange={setDialog}
          judul="Kirim pendaftaran?"
          deskripsi="Data yang sudah dikirim tidak bisa diubah sendiri. Periksa lagi sebelum melanjutkan."
          aksi={
            <>
              <Button varian="hantu" onClick={() => setDialog(false)}>
                Periksa lagi
              </Button>
              <Button onClick={() => setDialog(false)}>Kirim</Button>
            </>
          }
        />
      </Bagian>

      <Bagian judul="Keadaan kosong dan memuat">
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            judul="Belum ada pendaftar"
            deskripsi="Pendaftar akan muncul di sini setelah mengirim formulir."
            aksi={<Button varian="sekunder">Input manual</Button>}
          />
          <div className="flex flex-col gap-4">
            <SkeletonProses />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </Bagian>

      <Bagian judul="Data referensi (seed)" catatan="Jurusan dan bobot mata pelajaran dari database. Total bobot tiap jurusan harus 1,00.">
        {jurusan.length === 0 ? (
          <EmptyState judul="Belum ada data" deskripsi="Jalankan npm run db:seed." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {jurusan.map((j) => (
              <Card key={j.kode}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-3xl font-extrabold text-primer-tua">{j.kode}</h3>
                  <p className="angka text-sm text-tinta-redup">Kuota {j.kuota}</p>
                </div>
                <p className="mt-1 text-sm text-tinta-redup">{j.nama}</p>
                <table className="mt-3 w-full text-left text-sm">
                  <tbody>
                    {j.bobot.map((b) => (
                      <tr key={b.kode} className="border-b border-garis">
                        <td className="py-1.5">{b.mapel}</td>
                        <td className="py-1.5 text-right">{b.bobot.toFixed(2).replace(".", ",")}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="py-1.5 font-semibold">Total</td>
                      <td className="py-1.5 text-right font-semibold">{j.totalBobot.toFixed(2).replace(".", ",")}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            ))}
          </div>
        )}
      </Bagian>

      <Bagian judul="Motion" catatan="Motion untuk UI. Semua statis bila perangkat meminta kurangi gerak.">
        <Reveal>
          <Card>Reveal: muncul sekali saat masuk layar, 350 ms.</Card>
        </Reveal>
        <StaggerList className="grid gap-3 md:grid-cols-3">
          {["AKL", "MPLB", "FKK"].map((k) => (
            <Card key={k} className="font-display text-3xl font-extrabold text-primer-tua">
              {k}
            </Card>
          ))}
        </StaggerList>
        <div className="overflow-hidden">
          <PageTransition kunci={langkah}>
            <Card>
              Transisi halaman: isi berganti saat langkah berubah. Langkah aktif <span className="angka font-bold">{langkah}</span>.
            </Card>
          </PageTransition>
        </div>
      </Bagian>
    </div>
  );
}
