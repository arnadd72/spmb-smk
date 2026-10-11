import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db/client";
import { enkripsi, hashPencarian, hashToken } from "@/server/services/kripto";
import { normalisasiHp } from "@/server/services/pendaftarKolom";

/** Buat pendaftar langsung di database untuk test admin (tanpa lewat wizard). */
export async function buatPendaftarUji(
  o: {
    nama?: string;
    nomor?: string;
    periode?: string;
    status?: "pending" | "approved" | "rejected" | "revision";
    statusNilai?: "belumDicek" | "sesuai" | "dikoreksi";
    jurusan1Id?: bigint | null;
    nisn?: string;
    nik?: string;
    noHp?: string;
    asalSekolah?: string;
    sumber?: "daring" | "luring";
    berkasSinkron?: "menunggu" | "selesai" | "gagal";
    createdAt?: Date;
  } = {},
) {
  const nomor = o.nomor ?? `SPMB-2027-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  return prisma.pendaftar.create({
    data: {
      nomorPendaftaran: nomor,
      aksesTokenHash: hashToken(randomBytes(20).toString("hex")),
      periode: o.periode ?? "2027/2028",
      namaLengkap: o.nama ?? "Peserta Uji",
      nisn: o.nisn ?? "1234567890",
      nik: o.nik ? enkripsi(o.nik) : undefined,
      nikHash: o.nik ? hashPencarian(o.nik) : undefined,
      noHp: o.noHp ? enkripsi(o.noHp) : undefined,
      noHpHash: o.noHp ? hashPencarian(normalisasiHp(o.noHp)) : undefined,
      asalSekolah: o.asalSekolah,
      sumber: o.sumber,
      statusVerifikasi: o.status ?? "pending",
      statusNilai: o.statusNilai,
      jurusan1Id: o.jurusan1Id ?? undefined,
      berkasSinkron: o.berkasSinkron,
      createdAt: o.createdAt,
      nilaiRapor: { semester: [1, 2, 3, 4, 5], mapel: { matematika: { "1": 80 } } },
      nilaiRaporSumber: "manual",
      rekomendasiSkor: [],
      rekomendasiVersi: "uji",
    },
  });
}
