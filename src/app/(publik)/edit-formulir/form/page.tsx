import { redirect } from "next/navigation";

// Alamat lama form Edit Formulir (poin D): diarahkan ke Cek Pendaftaran.
export default function HalamanFormEditLama() {
  redirect("/cek-pendaftaran/form");
}
