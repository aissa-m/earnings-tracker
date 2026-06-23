import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "dinerico_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const user = String(body.username ?? "");
  const pass = String(body.password ?? "");

  const expectedUser = process.env.APP_USERNAME;
  const expectedPass = process.env.APP_PASSWORD;
  const sessionValue = process.env.APP_AUTH_TOKEN;

  if (!expectedUser || !expectedPass || !sessionValue) {
    return NextResponse.json({ error: "Faltan variables de entorno de autenticación." }, { status: 500 });
  }

  if (user !== expectedUser || pass !== expectedPass) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
}
