import { NextResponse, type NextRequest } from "next/server";
import { NAMA_COOKIE_ADMIN } from "@/server/auth/sesi";

// Pengecekan awal (optimistic) untuk halaman admin: tanpa cookie sesi, arahkan ke login.
// Keabsahan token dan peran diperiksa di layout panel dan di setiap route handler admin
// (Next.js 16: middleware.ts diganti proxy.ts).
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const adaCookie = Boolean(req.cookies.get(NAMA_COOKIE_ADMIN)?.value);

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !adaCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
