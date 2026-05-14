import { redirect } from "next/navigation";

import { requireAuth } from "../../../lib/auth";
import { createExpense } from "../../../lib/db";
import { hasDatabaseUrl } from "../../../lib/setup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireAuth();
  const wantsJson = request.headers.get("accept")?.includes("application/json");

  if (!hasDatabaseUrl()) {
    if (wantsJson) {
      return Response.json({ ok: false }, { status: 503 });
    }
    redirect("/");
  }

  const form = await request.formData();
  const companyCode = String(form.get("company") ?? "");
  const expenseDate = String(form.get("expenseDate") ?? "");
  const productName = String(form.get("productName") ?? "").trim();
  const qty = Number(form.get("qty") ?? "");
  const commission = Number(form.get("commission") ?? "");
  const partyName = String(form.get("partyName") ?? "").trim();

  if (!companyCode || !expenseDate || !productName || !partyName || Number.isNaN(qty) || Number.isNaN(commission)) {
    if (wantsJson) {
      return Response.json({ ok: false }, { status: 400 });
    }
    redirect("/?error=Invalid%20earning");
  }

  const expense = await createExpense({ companyCode, expenseDate, productName, qty, commission, partyName });
  if (wantsJson) {
    return Response.json({ ok: true, expense });
  }
  redirect("/");
}
