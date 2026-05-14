import { redirect } from "next/navigation";

import { requireAuth } from "../../../lib/auth";
import { clearPinnedChart, savePinnedChart, type AnalyticsChartType } from "../../../lib/db";
import { hasDatabaseUrl } from "../../../lib/setup";

export const runtime = "nodejs";

function chartType(value: string): AnalyticsChartType {
  return value === "pie" || value === "histogram" || value === "line" ? value : "bar";
}

/** Same-origin path only — avoids open redirects from form `return_to`. */
function safeReturnPath(raw: string): string {
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.includes("://")) return "/";
  return raw;
}

export async function POST(request: Request) {
  await requireAuth();

  if (!hasDatabaseUrl()) {
    redirect("/");
  }

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  if (intent === "clear") {
    await clearPinnedChart();
    redirect(safeReturnPath(String(form.get("return_to") ?? "/")));
  }

  const chart = chartType(String(form.get("chart") ?? "bar"));
  const year = String(form.get("year") ?? new Date().getFullYear().toString());
  const months = form
    .getAll("month")
    .map((month) => String(month))
    .filter((month) => /^\d{2}$/.test(month));

  await savePinnedChart({ chart, year, months });

  const params = new URLSearchParams({ year, chart });
  for (const month of months) {
    params.append("month", month);
  }

  redirect(`/analytics?${params.toString()}`);
}
