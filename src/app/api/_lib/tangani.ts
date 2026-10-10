import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { GalatApi } from "@/server/types/galat";

/** Ubah galat dari src/server jadi respons JSON seragam. Galat tak dikenal dicatat tanpa data pribadi. */
export function tanganiGalat(e: unknown): NextResponse {
  if (e instanceof GalatApi) {
    return NextResponse.json(
      { message: e.message, code: e.code, ...(e.errors ? { errors: e.errors } : {}) },
      { status: e.status },
    );
  }

  if (e instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const isu of e.issues) {
      const kunci = isu.path.join(".") || "_";
      (errors[kunci] ??= []).push(isu.message);
    }
    return NextResponse.json({ message: "Data tidak valid.", code: "VALIDATION_ERROR", errors }, { status: 422 });
  }

  console.error("[api] galat tak terduga:", e instanceof Error ? e.message : "tidak diketahui");
  return NextResponse.json({ message: "Terjadi kesalahan pada server.", code: "SERVER_ERROR" }, { status: 500 });
}

/** Bungkus handler agar semua galat lewat tanganiGalat. */
export function tangani<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      return tanganiGalat(e);
    }
  };
}
