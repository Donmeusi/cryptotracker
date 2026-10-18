import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isLoggedIn = !!req.auth;
  const isAuthPage =
    pathname.startsWith("/anmelden") || pathname.startsWith("/registrieren");
  const isPublicPage = pathname === "/" || isAuthPage;

  if (!isLoggedIn && !isPublicPage) {
    // Öffentliche Origin aus den Proxy-Headern ableiten. So funktioniert die
    // Instanz hinter jedem Reverse Proxy und direkt per IP, ohne dass eine
    // host-spezifische AUTH_URL gepflegt werden muss.
    const proto =
      req.headers.get("x-forwarded-proto") ??
      req.nextUrl.protocol.replace(":", "");
    const host =
      req.headers.get("x-forwarded-host") ??
      req.headers.get("host") ??
      req.nextUrl.host;
    return NextResponse.redirect(new URL("/anmelden", `${proto}://${host}`));
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
