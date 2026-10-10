// Skema Zod yang sama dengan server (PRD v4 6.4 "satu skema Zod per entitas"). Hanya modul validasi
// murni yang boleh diimpor dari sisi klien; modul src/server lain tidak boleh.
export { skemaLogin, type InputLogin } from "@/server/validasi/auth";
