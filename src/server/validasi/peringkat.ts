import { rataMapel, type NilaiRapor } from "@/server/validasi/wizard";

// Rumus rekomendasi jurusan (PRD v3.1 Bagian 12), murni tanpa database dan tanpa modul Node, supaya dipakai server
// dan pratinjau di editor bobot admin (sisi klien). Versi bobot (hash) dihitung di services/rekomendasi.ts.

export type BobotMapel = { kode: string; nama: string; bobot: number };
export type BobotJurusanData = { id: string; kode: string; nama: string; urutan: number; bobot: BobotMapel[] };

export type LabelRekomendasi = "Paling Sesuai" | "Juga Sesuai" | "Alternatif" | "Data Kurang";

export type RincianMapel = { kode: string; nama: string; bobot: number; nilai: number; kontribusi: number };

export type HasilJurusan = {
  jurusanId: string;
  kode: string;
  nama: string;
  skor: number;
  label: LabelRekomendasi;
  dataKurang: boolean;
  rincian: RincianMapel[];
  penjelasan: string;
};

const bulat2 = (n: number) => Math.round(n * 100) / 100;

export function hitungPeringkat(nilai: NilaiRapor, jurusan: BobotJurusanData[]): HasilJurusan[] {
  const rata: Record<string, number | null> = {};
  for (const [kode, sel] of Object.entries(nilai.mapel)) rata[kode] = rataMapel(sel);

  const hitung = jurusan.map((j) => {
    const totalBobot = j.bobot.reduce((a, m) => a + m.bobot, 0);
    const tersedia = j.bobot.filter((m) => typeof rata[m.kode] === "number");
    const bobotTersedia = tersedia.reduce((a, m) => a + m.bobot, 0);
    const skor = bobotTersedia > 0 ? tersedia.reduce((a, m) => a + m.bobot * (rata[m.kode] as number), 0) / bobotTersedia : 0;
    const rincian: RincianMapel[] = tersedia.map((m) => ({
      kode: m.kode,
      nama: m.nama,
      bobot: bulat2(m.bobot / bobotTersedia),
      nilai: bulat2(rata[m.kode] as number),
      kontribusi: bulat2((m.bobot / bobotTersedia) * (rata[m.kode] as number)),
    }));
    return {
      j,
      skor: bulat2(skor),
      dataKurang: totalBobot > 0 && bobotTersedia / totalBobot < 0.5,
      rincian,
      nilaiBerbobotTerbesar: Math.max(0, ...tersedia.map((m) => rata[m.kode] as number)),
    };
  });

  // Urut: skor tertinggi; seri -> nilai mapel berbobot terbesar, lalu urutan jurusan.
  hitung.sort(
    (a, b) => b.skor - a.skor || b.nilaiBerbobotTerbesar - a.nilaiBerbobotTerbesar || a.j.urutan - b.j.urutan,
  );
  const tertinggi = hitung.find((h) => !h.dataKurang)?.skor ?? hitung[0]?.skor ?? 0;

  const peringkat = hitung.map<HasilJurusan>((h, i) => {
    let label: LabelRekomendasi;
    if (h.dataKurang) label = "Data Kurang";
    else if (i === 0 || h.skor === tertinggi) label = "Paling Sesuai";
    else if (tertinggi - h.skor <= 3) label = "Juga Sesuai";
    else label = "Alternatif";

    const unggul = [...h.rincian].sort((a, b) => b.nilai * b.bobot - a.nilai * a.bobot).slice(0, 2);
    const penjelasan =
      unggul.length === 0
        ? "Nilai belum cukup untuk menilai jurusan ini."
        : `Nilai ${unggul.map((u) => `${u.nama} (${Math.round(u.nilai)})`).join(" dan ")} paling mendukung ${h.j.kode}.`;

    return { jurusanId: h.j.id, kode: h.j.kode, nama: h.j.nama, skor: h.skor, label, dataKurang: h.dataKurang, rincian: h.rincian, penjelasan };
  });

  return peringkat;
}

