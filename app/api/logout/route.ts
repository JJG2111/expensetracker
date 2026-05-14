import { redirect } from "next/navigation";

import { clearAuthCookie } from "../../../lib/auth";

export const runtime = "nodejs";

export async function POST() {
  await clearAuthCookie();
  redirect("/login");
}
