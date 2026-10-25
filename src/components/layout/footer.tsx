import Link from "next/link";

const tautanCepat: Array<[string, string]> = [
  ["/jurusan", "Program keahlian"],
  ["/#alur-daftar", "Alur pendaftaran"],
  ["/berita", "Berita dan agenda"],
  ["/cek-pendaftaran", "Cek pendaftaran"],
  ["/kebijakan-privasi", "Kebijakan privasi"],
];

export function Footer() {
  return (
    <footer className="mt-auto bg-ink text-kertas">
      <div className="wadah grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-kertas/70">
            Lembaga Pendidikan Ma&apos;arif NU PCNU Kab. Banyumas
          </p>
          <p className="mt-2 font-display text-2xl font-extrabold">SMK Ma&apos;arif NU 1 Wangon</p>
          <address className="mt-4 not-italic leading-relaxed text-kertas/85">
            Jl. Karangjengkol RT.02/RW.04 Wangon, Banyumas 53176
            <br />
            Telepon (0281) 513425
            <br />
            <a className="underline underline-offset-2" href="mailto:smk_maarifnu1wgn@yahoo.co.id">
              smk_maarifnu1wgn@yahoo.co.id
            </a>
            <br />
            <a className="underline underline-offset-2" href="https://www.smkmanu1wangon.sch.id">
              www.smkmanu1wangon.sch.id
            </a>
          </address>
        </div>

        <nav aria-label="Tautan cepat">
          <p className="font-display text-lg font-bold">Tautan cepat</p>
          <ul className="mt-3 flex flex-col text-kertas/85">
            {tautanCepat.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="inline-block min-h-11 py-2.5 underline-offset-2 hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-display text-lg font-bold">Butuh bantuan?</p>
          <p className="mt-3 text-kertas/85">
            Hubungi panitia SPMB lewat telepon sekolah atau datang langsung pada jam kerja.
          </p>
        </div>
      </div>
      <div className="border-t border-kertas/15">
        <div className="wadah py-4 text-sm text-kertas/70">
          <p>SPMB SMK Ma&apos;arif NU 1 Wangon</p>
        </div>
      </div>
    </footer>
  );
}
