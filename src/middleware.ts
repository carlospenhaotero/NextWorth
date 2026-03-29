import { NextResponse, type NextRequest } from "next/server";

const guestOnlyRoutes = ["/login", "/register", "/"];

const protectedRoutes = [
  "/overview",
  "/assets",
  "/add-asset",
  "/search-assets",
  "/settings",
];

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = hasSessionCookie(request);

  if (
    guestOnlyRoutes.some((route) =>
      route === "/" ? pathname === "/" : pathname.startsWith(route),
    )
  ) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }
    return NextResponse.next();
  }

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/overview/:path*",
    "/assets/:path*",
    "/add-asset/:path*",
    "/search-assets/:path*",
    "/settings/:path*",
  ],
};
