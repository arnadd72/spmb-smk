import { Resend } from "resend";

// Klien email (Resend, PRD v4 15.4). Tanpa RESEND_API_KEY pengiriman dilewati dengan status jelas, supaya pengembangan lokal
// dan pendaftaran tidak bergantung pada layanan email.

export type HasilEmail = { status: "terkirim" | "dilewati" | "gagal"; pesan?: string };

const PENGIRIM_BAWAAN = "SPMB SMK Ma'arif NU 1 Wangon <spmb@smkmanu1wangon.sch.id>";

export async function kirimEmail(m: { ke: string; subjek: string; html: string; teks: string }): Promise<HasilEmail> {
  const kunci = process.env.RESEND_API_KEY;
  if (!kunci) return { status: "dilewati", pesan: "RESEND_API_KEY belum diisi." };

  try {
    const { error } = await new Resend(kunci).emails.send({
      from: process.env.RESEND_FROM || PENGIRIM_BAWAAN,
      to: m.ke,
      subject: m.subjek,
      html: m.html,
      text: m.teks,
    });
    return error ? { status: "gagal", pesan: error.message } : { status: "terkirim" };
  } catch (e) {
    return { status: "gagal", pesan: e instanceof Error ? e.message : "Gagal mengirim email." };
  }
}
