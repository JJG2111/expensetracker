import { redirect } from "next/navigation";

import { requireAuth } from "../../../lib/auth";
import { createExpense } from "../../../lib/db";
import { hasDatabaseUrl } from "../../../lib/setup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireAuth();

  if (!hasDatabaseUrl()) {
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
    redirect("/?error=Invalid%20expense");
  }

  await createExpense({ companyCode, expenseDate, productName, qty, commission, partyName });
  redirect("/");
}
