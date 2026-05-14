import { NextResponse } from "next/server";

import { isAuthenticated } from "../../../lib/auth";
import { companies, users } from "../../../lib/constants";
import { getExpensesByIds, saveReportHistory } from "../../../lib/db";
import { selectedCsvDownload, selectedPdf, selectedXlsx } from "../../../lib/reports";
import { hasDatabaseUrl } from "../../../lib/setup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!hasDatabaseUrl()) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const form = await request.formData();
  const ids = form
    .getAll("expense_id")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));
  const userCode = String(form.get("user") ?? "JVG") as keyof typeof users;
  const companyCode = String(form.get("company") ?? "ACC") as keyof typeof companies;
  const reportDate = String(form.get("reportDate") ?? "");
  const format = String(form.get("format") ?? "pdf");

  if (!ids.length || !(userCode in users) || !(companyCode in companies) || !reportDate) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const expenses = await getExpensesByIds(ids);
  if (!expenses.length) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const report =
    format === "xlsx"
      ? await selectedXlsx(expenses, userCode, companyCode, reportDate)
      : format === "csv"
        ? selectedCsvDownload(expenses, userCode, companyCode, reportDate)
        : await selectedPdf(expenses, userCode, companyCode, reportDate);

  const contentType =
    format === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : format === "csv"
        ? "text/csv; charset=utf-8"
        : "application/pdf";

  await saveReportHistory(report.filename, contentType, report.bytes);
  const body = new ArrayBuffer(report.bytes.byteLength);
  new Uint8Array(body).set(report.bytes);

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${report.filename}"`
    }
  });
}
