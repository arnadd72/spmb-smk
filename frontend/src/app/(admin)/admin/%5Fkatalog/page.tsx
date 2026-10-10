import { notFound } from "next/navigation";
import { Katalog } from "./katalog";

export const metadata = { title: "Katalog komponen" };

// Hanya untuk pengembangan lokal (PRD 16.7).
export default function HalamanKatalog() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Katalog />;
}
