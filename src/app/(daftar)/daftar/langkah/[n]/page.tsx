import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Stepper } from "@/components/ui/stepper";
import { LangkahAkta, LangkahRapor, type BerkasKlien } from "@/features/wizard/langkah-berkas";
import { LangkahForm, type Salinan } from "@/features/wizard/langkah-form";
import { LangkahJurusan } from "@/features/wizard/langkah-jurusan";
import { LangkahTinjau, type BagianTinjau } from "@/features/wizard/langkah-tinjau";
import { TombolMulaiUlang } from "@/features/wizard/mulai-daftar";
import { NAMA_LANGKAH, TOTAL_LANGKAH, rataMapel, type DefinisiField, type NilaiRapor } from "@/features/wizard/schema-client";
import { Transisi } from "@/features/wizard/transisi";
import { formatTanggal } from "@/lib/format";
import { NAMA_COOKIE_DRAF, ambilDraf, ambilKonfigWizard, muatDefinisiField, rekomendasiDraf, type Berkas } from "@/server/services/draf";
import { mapelBerbobot, muatBobotJurusan } from "@/server/services/rekomendasi";

export const metadata = { title: "Pendaftaran", robots: { index: false } };

const daftarBerkas = (b: Berkas | Berkas[] | undefined): BerkasKlien[] => (Array.isArray(b) ? b : b ? [b] : []);

function tampilNilai(f: DefinisiField, v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  if (f.tipe === "checkbox") return v ? "Ya" : "Tidak";
  if (f.tipe === "date" && typeof v === "string") return formatTanggal(v);
  if ((f.tipe === "select" || f.tipe === "radio") && f.opsi) return f.opsi.find((o) => o.nilai === v)?.label ?? String(v);
  return String(v);
}

export default async function Langkah({ params }: PageProps<"/daftar/langkah/[n]">) {
  const n = Number((await params).n);
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_LANGKAH) notFound();

  const token = (await cookies()).get(NAMA_COOKIE_DRAF)?.value;
  const draf = await ambilDraf(token);
  if (!draf || draf.sudahKirim) redirect("/daftar");
  if (n > draf.langkahTerakhir) redirect(`/daftar/langkah/${draf.langkahTerakhir}`);

  const fields = await muatDefinisiField();
  const doLangkah = fields.filter((f) => f.langkah === n);
  const awal = draf.data[String(n)] ?? {};
  const nama = NAMA_LANGKAH[n - 1];

  let isi;
  if (n === 1) {
    const konfig = await ambilKonfigWizard();
    isi = (
      <LangkahForm
        langkah={1}
        fields={doLangkah}
        awal={awal}
        pembuka={
          <div className="rounded-kartu bg-permukaan-alt p-4 text-sm text-tinta">
            <p className="font-semibold">Perlindungan data pribadi</p>
            {konfig.persetujuan ? (
              konfig.persetujuan.split(/\n+/).map((baris, i) => (
                <p key={i} className="mt-1">
                  {baris}
                </p>
              ))
            ) : (
              <p className="mt-1">
                Data yang Anda isi dipakai panitia SPMB SMK Ma&apos;arif NU 1 Wangon untuk seleksi dan administrasi peserta didik
                tahun ajaran {konfig.tahunAjaran}. Data disimpan aman, data sensitif dienkripsi, dan hanya dapat dilihat panitia
                yang berwenang.{konfig.kontak ? ` Pertanyaan: ${konfig.kontak}.` : ""}
              </p>
            )}
          </div>
        }
      />
    );
  } else if (n === 2) {
    const slot = doLangkah
      .filter((f) => f.tipe === "file")
      .map((f) => ({ kunci: f.kunci, label: f.label, wajib: f.wajib, bantuan: f.teksBantuan ?? undefined }));
    isi = <LangkahAkta slot={slot} berkas={Object.fromEntries(slot.map((s) => [s.kunci, daftarBerkas(draf.berkas[s.kunci])]))} />;
  } else if (n === 3) {
    const [konfig, bobot] = await Promise.all([ambilKonfigWizard(), muatBobotJurusan()]);
    const def = doLangkah.find((f) => f.kunci === "rapor");
    isi = (
      <LangkahRapor
        slot={{
          kunci: "rapor",
          label: def?.label ?? "Rapor SMP/MTs",
          wajib: true,
          jamak: true,
          bantuan: "Unggah semua halaman rapor yang memuat nilai, bisa beberapa berkas (maksimal 10).",
        }}
        berkas={daftarBerkas(draf.berkas.rapor)}
        mapel={mapelBerbobot(bobot).map((m) => ({ kode: m.kode, nama: m.nama }))}
        semester={konfig.semester}
        awal={awal.nilai_rapor as NilaiRapor | undefined}
      />
    );
  } else if (n === 4) {
    const rekom = await rekomendasiDraf(token);
    const opsi = doLangkah.find((f) => f.kunci === "jurusan_1")?.opsi ?? [];
    isi = (
      <LangkahJurusan
        kartu={rekom.peringkat.map((p) => ({ kode: p.kode, nama: p.nama, skor: p.skor, label: p.label, penjelasan: p.penjelasan, rincian: p.rincian }))}
        kuotaPenuh={rekom.kuotaPenuh}
        opsi={opsi}
        awal={{ jurusan_1: awal.jurusan_1 as string | undefined, jurusan_2: awal.jurusan_2 as string | undefined }}
      />
    );
  } else if (n === 8) {
    const bobot = await muatBobotJurusan();
    const rapor = draf.data["3"]?.nilai_rapor as NilaiRapor | undefined;
    const bagian: BagianTinjau[] = [1, 4, 5, 6, 7].map((l) => ({
      judul: NAMA_LANGKAH[l - 1],
      langkah: l,
      baris: fields
        .filter((f) => f.langkah === l && f.tipe !== "file" && f.tipe !== "tabel" && f.tipe !== "checkbox")
        .map((f) => ({ label: f.label, nilai: tampilNilai(f, draf.data[String(l)]?.[f.kunci]) })),
    }));
    bagian.splice(1, 0, {
      judul: "Berkas dan nilai rapor",
      langkah: 3,
      baris: [
        { label: "Akta kelahiran", nilai: draf.berkas.akta ? "Terunggah" : "Tidak diunggah" },
        { label: "Kartu keluarga", nilai: draf.berkas.kk ? "Terunggah" : "Tidak diunggah" },
        { label: "Berkas rapor", nilai: `${daftarBerkas(draf.berkas.rapor).length} berkas` },
        ...mapelBerbobot(bobot).map((m) => {
          const r = rataMapel(rapor?.mapel[m.kode]);
          return { label: `Rata-rata ${m.nama}`, nilai: r === null ? "" : r.toFixed(1) };
        }),
      ],
    });
    const ujian = draf.data["7"]?.nilai_ujian as Record<string, number> | undefined;
    if (ujian) {
      bagian[bagian.length - 1].baris.push(
        ...Object.entries(ujian).map(([k, v]) => ({ label: `Nilai ujian ${k.replace("_", " ")}`, nilai: String(v) })),
      );
    }
    isi = <LangkahTinjau bagian={bagian} />;
  } else {
    const dataMurid = draf.data["5"] ?? {};
    const salinan: Salinan | undefined =
      n === 5
        ? { label: "Nomor WhatsApp sama dengan nomor HP", peta: { no_wa: "no_hp" } }
        : n === 6
          ? {
              label: "Alamat orang tua sama dengan alamat murid",
              peta: { alamat_ortu: "alamat", ortu_rt: "rt", ortu_rw: "rw", ortu_desa: "desa", ortu_kecamatan: "kecamatan", ortu_kabupaten: "kabupaten", ortu_propinsi: "propinsi" },
              sumber: dataMurid,
            }
          : undefined;
    isi = <LangkahForm langkah={n} fields={doLangkah} awal={awal} salinan={salinan} />;
  }

  return (
    <>
      <Stepper langkah={n} total={TOTAL_LANGKAH} nama={nama} menempel />
      <div className="px-4 py-8 sm:py-10">
        <Transisi key={n}>
          <div className="mb-6 flex items-start justify-between gap-3">
            <h1 className="font-display text-[clamp(1.5rem,5vw,2rem)] font-semibold leading-tight text-ink">{nama}</h1>
            <TombolMulaiUlang />
          </div>
          {isi}
        </Transisi>
      </div>
    </>
  );
}
