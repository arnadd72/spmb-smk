import { redirect } from "next/navigation";

// Cek Status digabung ke Cek Pendaftaran (poin D); alamat lama tetap berfungsi.
export default function HalamanCekStatus() {
  redirect("/cek-pendaftaran");
}
