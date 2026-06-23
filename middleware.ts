import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "dinerico_session";

export function middleware(request: NextRequest) {
  const token = process.env.APP_AUTH_TOKEN;
  const session = request.cookies.get(COOKIE_NAME)?.value;
  const loggedIn = Boolean(token && session === token);
  const loginUrl = new URL("/login", request.url);

  if (request.nextUrl.pathname === "/login") {
    return loggedIn ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (!loggedIn) {
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/login|api/logout|_next/static|_next/image|favicon.ico).*)"],
};
