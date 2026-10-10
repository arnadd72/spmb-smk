import Link from "next/link";
import { notFound } from "next/navigation";
import { GambarKonten } from "@/features/berita/gambar-konten";
import { formatTanggal } from "@/lib/format";
import { ambilBerita } from "@/server/actions/ambilPublik";

export const revalidate = 300;

async function cari(slug: string) {
  try {
    return await ambilBerita(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps<"/berita/[slug]">) {
  const { slug } = await params;
  const b = await cari(slug);
  return b ? { title: b.judul, description: b.cuplikan } : { title: "Berita tidak ditemukan" };
}

export default async function DetailBerita({ params }: PageProps<"/berita/[slug]">) {
  const { slug } = await params;
  const b = await cari(slug);
  if (!b) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-20">
      <Link href="/berita" className="inline-flex min-h-11 items-center text-sm font-bold text-primer-tua underline underline-offset-4">
        Semua berita
      </Link>
      <p className="mt-4 text-sm font-semibold text-tinta-redup">{formatTanggal(b.tanggal)}</p>
      <h1 className="mt-2 text-[clamp(2rem,4.4vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.015em] text-ink">{b.judul}</h1>

      {b.gambar && (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-kartu bg-permukaan-alt">
          <GambarKonten src={b.gambar} alt="" sizes="(min-width: 768px) 48rem, 100vw" prioritas />
        </div>
      )}

      {/* isiHtml sudah disanitasi di server saat disimpan; hanya field ini yang boleh dirender sebagai HTML. */}
      <div className="isi-berita mt-8" dangerouslySetInnerHTML={{ __html: b.isiHtml }} />
    </article>
  );
}
