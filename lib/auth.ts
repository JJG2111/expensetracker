import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const AUTH_COOKIE = "expense_reports_session";
const USERNAME = "admin";
const PASSWORD = "Jenil@12345";

function secret() {
  return process.env.AUTH_SECRET || PASSWORD;
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function sessionValue() {
  const value = USERNAME;
  return `${value}.${signature(value)}`;
}

function validSession(value?: string) {
  if (!value) return false;

  const [username, sig] = value.split(".");
  if (username !== USERNAME || !sig) return false;

  const expected = signature(username);
  const actualBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function validCredentials(username: string, password: string) {
  return username === USERNAME && password === PASSWORD;
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return validSession(cookieStore.get(AUTH_COOKIE)?.value);
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

export async function setAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, sessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}
