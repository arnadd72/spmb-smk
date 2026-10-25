// Template email "Kode Pendaftaran SPMB Anda" (PRD v3.1 15.4): nomor menonjol, ringkasan, tautan halaman sukses bertoken,
// Cek Pendaftaran (lihat, ubah, unduh ulang formulir), grup WhatsApp, dan daftar berkas fisik. Gaya ditulis sebaris dan satu kolom agar tampil baik di klien email mana pun.

export type DataEmailKode = {
  nomor: string;
  nama: string;
  nisn?: string | null;
  jurusan1?: string | null;
  jurusan2?: string | null;
  periode: string;
  /** Alamat situs tanpa garis miring akhir. */
  situs: string;
  /** Token akses halaman sukses; kosong bila kirim ulang (token mentah tidak tersimpan). */
  aksesToken?: string;
  waGroup?: string | null;
  tanggalVerifikasi?: string | null;
  kontak?: string | null;
};

const BERKAS_FISIK = [
  "Akta asli (1 lembar)",
  "Ijazah SD/MI (1 lembar, opsional)",
  "Fotokopi akte kelahiran (1 lembar)",
  "Fotokopi kartu keluarga (1 lembar)",
  "Fotokopi KIP/KIS/PKH (1 lembar, bila ada)",
  "Fotokopi KTP orang tua (2 lembar)",
  "Pas foto 3 x 4 (2 lembar)",
  "Surat Keterangan Lulus (SKL) (1 lembar)",
  "Fotokopi ijazah MTs/SMP (1 lembar, opsional)",
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function emailKodePendaftaran(d: DataEmailKode): { subjek: string; html: string; teks: string } {
  const subjek = `Kode Pendaftaran SPMB Anda: ${d.nomor}`;
  const tautanSukses = d.aksesToken ? `${d.situs}/daftar/sukses/${d.aksesToken}` : null;
  const tautanFormulir = d.aksesToken ? `${d.situs}/api/v1/pendaftar/${d.aksesToken}/formulir?unduh=1` : null;
  const tautanCek = `${d.situs}/cek-pendaftaran`;
  const wa = d.waGroup?.startsWith("https://") ? d.waGroup : null;

  const ringkasan: [string, string][] = [
    ["Nama", d.nama],
    ...(d.nisn ? ([["NISN", d.nisn]] as [string, string][]) : []),
    ["Tahun ajaran", d.periode],
    ["Pilihan jurusan 1", d.jurusan1 || "-"],
  ];

  const tombol = (href: string, label: string, utama = false) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:4px 8px 4px 0;padding:12px 18px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;${
      utama ? "background:#057a3c;color:#ffffff;" : "border:2px solid #057a3c;color:#046a33;"
    }">${esc(label)}</a>`;

  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subjek)}</title></head>
<body style="margin:0;background:#f5f1ea;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td style="background:#057a3c;padding:18px 24px;color:#ffffff;font-size:15px;font-weight:700;">SMK Ma'arif NU 1 Wangon<br><span style="font-weight:400;font-size:13px;">Pendaftaran Murid Baru SPMB</span></td></tr>
<tr><td style="padding:28px 24px 8px;">
<p style="margin:0 0 6px;font-size:16px;">Halo, <strong>${esc(d.nama)}</strong>. Pendaftaran Anda sudah kami terima. Simpan nomor ini:</p>
<p style="margin:14px 0;padding:18px 12px;background:#e8f3ec;border-radius:10px;text-align:center;font-size:28px;font-weight:800;letter-spacing:1px;color:#046a33;">${esc(d.nomor)}</p>
</td></tr>
<tr><td style="padding:0 24px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
${ringkasan.map(([k, v]) => `<tr><td style="padding:5px 0;color:#666;width:42%;">${esc(k)}</td><td style="padding:5px 0;font-weight:700;">${esc(v)}</td></tr>`).join("\n")}
</table></td></tr>
<tr><td style="padding:16px 24px 4px;">
${tautanSukses ? tombol(tautanSukses, "Buka halaman pendaftaran", true) : ""}${tautanFormulir ? tombol(tautanFormulir, "Unduh formulir (PDF)") : ""}${tombol(tautanCek, "Cek pendaftaran", !tautanSukses)}${wa ? tombol(wa, "Gabung grup WhatsApp") : ""}
</td></tr>
<tr><td style="padding:16px 24px 8px;">
<p style="margin:0 0 6px;font-size:15px;font-weight:700;">Berkas yang dibawa saat verifikasi${d.tanggalVerifikasi ? ` (${esc(d.tanggalVerifikasi)})` : ""}</p>
<ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;">${BERKAS_FISIK.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
</td></tr>
<tr><td style="padding:16px 24px 24px;font-size:12px;color:#666;line-height:1.6;">
Nomor pendaftaran dan tanggal lahir dipakai untuk membuka halaman Cek Pendaftaran: lihat data, ubah bila keliru, atau unduh ulang formulir. Jangan bagikan tautan di atas kepada orang lain.${d.kontak ? `<br>Pertanyaan: ${esc(d.kontak)}` : ""}
</td></tr>
</table></td></tr></table></body></html>`;

  const teks = [
    `Halo ${d.nama},`,
    "",
    "Pendaftaran Anda sudah kami terima.",
    `Nomor pendaftaran: ${d.nomor}`,
    ...ringkasan.map(([k, v]) => `${k}: ${v}`),
    "",
    ...(tautanSukses ? [`Halaman pendaftaran: ${tautanSukses}`] : []),
    ...(tautanFormulir ? [`Unduh formulir (PDF): ${tautanFormulir}`] : []),
    `Cek pendaftaran (lihat, ubah, unduh ulang formulir): ${tautanCek}`,
    ...(wa ? [`Grup WhatsApp: ${wa}`] : []),
    "",
    `Berkas yang dibawa saat verifikasi${d.tanggalVerifikasi ? ` (${d.tanggalVerifikasi})` : ""}:`,
    ...BERKAS_FISIK.map((b) => `- ${b}`),
    ...(d.kontak ? ["", `Pertanyaan: ${d.kontak}`] : []),
    "",
    "SMK Ma'arif NU 1 Wangon",
  ].join("\n");

  return { subjek, html, teks };
}
