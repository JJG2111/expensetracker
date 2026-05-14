"use client";

import { Area, AreaChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { money, months } from "../../lib/constants";
import ChartDownloadButton from "./ChartDownloadButton";

type MonthlyPartyOrder = {
  month: string;
  party: string;
  order_value: number;
};

const chartColors = ["#e45756", "#4c78a8", "#f2cf5b", "#54a24b", "#b279a2", "#72b7b2", "#f58518", "#9d755d"];

export default function PartyMonthlyLineChart({ rows, selectedMonths }: { rows: MonthlyPartyOrder[]; selectedMonths: string[] }) {
  const parties = Array.from(
    rows.reduce((totals, row) => totals.set(row.party, (totals.get(row.party) ?? 0) + row.order_value), new Map<string, number>())
  )
    .filter(([, total]) => total > 0)
    .sort((left, right) => right[1] - left[1])
    .map(([party]) => party)
    .slice(0, 8);
  const monthLabels = new Map<string, string>(months.map(([value, label]) => [value, label.slice(0, 3)]));
  const chartRows = selectedMonths
    .slice()
    .sort()
    .map((month) => {
      const bucket: Record<string, string | number> = { month: monthLabels.get(month) ?? month };
      for (const party of parties) {
        bucket[party] = rows.find((row) => row.month === month && row.party === party)?.order_value ?? 0;
      }
      return bucket;
    });

  return (
    <section className="card p-3 p-md-4 mb-3">
      <div className="d-flex flex-column flex-sm-row gap-2 justify-content-between align-items-sm-start mb-3">
        <div>
          <h2 className="h4 fw-bold mb-1">Monthly Contribution By Party</h2>
          <p className="text-secondary mb-0">Stacked contribution chart showing how each party adds to monthly order value.</p>
        </div>
        {parties.length > 0 && <ChartDownloadButton filename="monthly-contribution-by-party" targetId="monthly-contribution-by-party-chart" />}
      </div>
      {parties.length ? (
        <div id="monthly-contribution-by-party-chart" className="chart-export-surface" style={{ height: 390 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartRows} margin={{ top: 8, right: 18, left: 0, bottom: 12 }}>
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => money(Number(value)).replace(".00", "")} width={80} />
              <Tooltip formatter={(value) => money(Number(value ?? 0))} />
              <Legend />
              {parties.map((party, index) => (
                <Area
                  dataKey={party}
                  fill={chartColors[index % chartColors.length]}
                  fillOpacity={0.82}
                  key={party}
                  stroke={chartColors[index % chartColors.length]}
                  stackId="monthlyContribution"
                  type="monotone"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="alert alert-secondary mb-0">No monthly contribution data for this filter.</div>
      )}
    </section>
  );
}
