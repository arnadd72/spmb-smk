import { redirect } from "next/navigation";

// Edit Formulir kini bernama Cek Pendaftaran (poin D); alamat lama dari email dan formulir PDF tetap berfungsi.
export default function HalamanEditFormulirLama() {
  redirect("/cek-pendaftaran");
}
