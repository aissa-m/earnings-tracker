import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "dinerico_session";
const ACCESS_PATH = "/access";

export function middleware(request: NextRequest) {
  const token = process.env.APP_AUTH_TOKEN;
  const session = request.cookies.get(COOKIE_NAME)?.value;
  const loggedIn = Boolean(token && session === token);
  const pathname = request.nextUrl.pathname;

  if (pathname === ACCESS_PATH) {
    return loggedIn ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (!loggedIn) {
    return NextResponse.redirect(new URL(ACCESS_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/login|api/logout|_next/static|_next/image|favicon.ico).*)"],
};
