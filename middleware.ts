import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "dinerico_session";
const ACCESS_PATH = "/access";

export function middleware(request: NextRequest) {
  const token = process.env.APP_AUTH_TOKEN;
  const session = request.cookies.get(COOKIE_NAME)?.value;
  const loggedIn = Boolean(token && session === token);
  const accessUrl = new URL(ACCESS_PATH, request.url);

  if (request.nextUrl.pathname === ACCESS_PATH) {
    return loggedIn ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (!loggedIn) {
    return NextResponse.redirect(accessUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/login|api/logout|login|_next/static|_next/image|favicon.ico).*)"],
};
