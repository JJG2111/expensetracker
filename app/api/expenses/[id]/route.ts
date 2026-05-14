import { redirect } from "next/navigation";

import { isAuthenticated, requireAuth } from "../../../../lib/auth";
import { deleteExpense, updateExpense } from "../../../../lib/db";
import { hasDatabaseUrl } from "../../../../lib/setup";

export const runtime = "nodejs";

function expenseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) ? id : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const wantsJson = request.headers.get("accept")?.includes("application/json");

  if (!hasDatabaseUrl()) {
    if (wantsJson) {
      return Response.json({ ok: false }, { status: 503 });
    }
    redirect("/");
  }

  const { id: rawId } = await params;
  const id = expenseId(rawId);
  if (!id) {
    if (wantsJson) {
      return Response.json({ ok: false }, { status: 400 });
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
    redirect("/");
  }

  const expense = await updateExpense(id, { companyCode, expenseDate, productName, qty, commission, partyName });
  if (wantsJson) {
    return Response.json({ ok: true, expense });
  }
  redirect("/");
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return Response.json({ ok: false }, { status: 401 });
  }

  if (!hasDatabaseUrl()) {
    return Response.json({ ok: false }, { status: 503 });
  }

  const { id: rawId } = await params;
  const id = expenseId(rawId);
  if (!id) {
    return Response.json({ ok: false }, { status: 400 });
  }

  await deleteExpense(id);
  return Response.json({ ok: true });
}
