import { notFound } from "next/navigation";
import { ambilJurusanDenganBobot } from "@/server/actions/ambilReferensi";
import { Katalog } from "./katalog";

export const metadata = { title: "Katalog komponen" };

// Hanya untuk pengembangan lokal (PRD 16.7).
export default async function HalamanKatalog() {
  if (process.env.NODE_ENV === "production") notFound();
  const jurusan = await ambilJurusanDenganBobot();
  return <Katalog jurusan={jurusan} />;
}
