import { redirect } from "next/navigation";

import { requireAuth } from "../../../lib/auth";
import { savePinnedChart, type AnalyticsChartType } from "../../../lib/db";
import { hasDatabaseUrl } from "../../../lib/setup";

export const runtime = "nodejs";

function chartType(value: string): AnalyticsChartType {
  return value === "pie" || value === "histogram" || value === "line" ? value : "bar";
}

export async function POST(request: Request) {
  await requireAuth();

  if (!hasDatabaseUrl()) {
    redirect("/");
  }

  const form = await request.formData();
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
