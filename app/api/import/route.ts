import { redirect } from "next/navigation";

import { requireAuth } from "../../../lib/auth";
import { createExpense } from "../../../lib/db";
import { hasDatabaseUrl } from "../../../lib/setup";

export const runtime = "nodejs";

type CsvRow = Record<string, string>;

function parseCsv(text: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(field.trim());
      field = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function parseRows(text: string): CsvRow[] {
  const [headers, ...rows] = parseCsv(text);
  if (!headers?.length) return [];

  return rows.map((row) =>
    headers.reduce<CsvRow>((record, header, index) => {
      record[header.trim().toLowerCase()] = row[index]?.trim() ?? "";
      return record;
    }, {})
  );
}

function parseDate(value: string) {
  const trimmed = value.trim();
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, day, month, year] = slash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const dash = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dash) {
    const [, year, month, day] = dash;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function numberValue(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  await requireAuth();

  if (!hasDatabaseUrl()) {
    redirect("/import?error=Database%20setup%20required");
  }

  const form = await request.formData();
  const companyCode = String(form.get("company") ?? "");
  const files = form.getAll("file").filter((file): file is File => file instanceof File && file.size > 0);

  if (!companyCode || !files.length) {
    redirect("/import?error=Choose%20a%20company%20and%20at%20least%20one%20CSV%20file");
  }

  let imported = 0;
  let skipped = 0;
  let total = 0;

  for (const file of files) {
    const rows = parseRows(await file.text());
    for (const row of rows) {
      const productName = row["product name"]?.trim();
      const expenseDate = parseDate(row.date ?? "");
      const qty = numberValue(row.qty ?? "");
      const commission = numberValue(row.commission ?? "");
      const partyName = row["party name"]?.trim();

      if (!productName || !expenseDate || qty === null || commission === null || !partyName) {
        skipped += 1;
        continue;
      }

      await createExpense({ companyCode, expenseDate, productName, qty, commission, partyName });
      imported += 1;
      total += qty * commission;
    }
  }

  const params = new URLSearchParams({
    imported: imported.toString(),
    skipped: skipped.toString(),
    total: new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(total)
  });
  redirect(`/import?${params.toString()}`);
}
