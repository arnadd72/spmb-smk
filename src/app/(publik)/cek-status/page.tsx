import { redirect } from "next/navigation";

export const metadata = { title: "Edit formulir" };

export default function HalamanCekStatus() {
  redirect("/edit-formulir");
}
