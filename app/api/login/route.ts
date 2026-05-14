import { redirect } from "next/navigation";

import { setAuthCookie, validCredentials } from "../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");

  if (!validCredentials(username, password)) {
    redirect("/login?error=1");
  }

  await setAuthCookie();
  redirect("/");
}
