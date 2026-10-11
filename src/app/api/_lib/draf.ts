import { cookies } from "next/headers";
import { NAMA_COOKIE_DRAF } from "@/server/services/draf";

export async function tokenDrafDariCookie(): Promise<string | undefined> {
  return (await cookies()).get(NAMA_COOKIE_DRAF)?.value;
}

export function ipDariRequest(req: Request): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}
