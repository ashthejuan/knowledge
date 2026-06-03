import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/ingest", "/chat"];
const AUTH_ROUTES = ["/signin", "/register"];

function isRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const isAuthenticated = Boolean(token);

  if (isRoute(pathname, PROTECTED_ROUTES) && !isAuthenticated) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);

    return NextResponse.redirect(signInUrl);
  }

  if (isRoute(pathname, AUTH_ROUTES) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ingest/:path*",
    "/chat/:path*",
    "/signin",
    "/register",
  ],
};
