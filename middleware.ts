import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isLoggedIn = !!req.auth;
  const isAuthPage =
    pathname.startsWith("/anmelden") || pathname.startsWith("/registrieren");
  const isPublicPage = pathname === "/" || isAuthPage;

  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL("/anmelden", req.url));
  }

  // Bewusst KEIN Redirect von angemeldeten Benutzern weg von /anmelden:
  // Ein JWT kann auf einen geloeschten Benutzer zeigen. Die geschuetzten
  // Seiten leiten dann auf /anmelden um - wuerde die Middleware von dort
  // wieder auf /dashboard schicken, entstuende eine Redirect-Schleife.
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
