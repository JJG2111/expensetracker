"use client";

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { money } from "../../lib/constants";
import ChartDownloadButton from "./ChartDownloadButton";

type DistributionRow = {
  label: string;
  revenue: number;
  expense_count: number;
};

const chartColors = ["#0f766e", "#2563eb", "#f97316", "#7c3aed", "#dc2626", "#0891b2", "#ca8a04", "#db2777"];

function currencyTooltip(value: unknown) {
  return money(Number(value ?? 0));
}

export default function DistributionChart({
  title,
  rows,
  chart
}: {
  title: string;
  rows: DistributionRow[];
  chart: "bar" | "pie";
}) {
  const chartRows = rows.slice(0, 10);
  const chartId = `chart-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${chart}`;

  return (
    <section className="card p-3 p-md-4 mb-3">
      <div className="d-flex flex-column flex-sm-row gap-2 justify-content-between align-items-sm-center mb-3">
        <h2 className="h4 fw-bold mb-0">{title}</h2>
        {rows.length > 0 && <ChartDownloadButton filename={`${title}-${chart}`} targetId={chartId} />}
      </div>
      {rows.length ? (
        <>
          <div id={chartId} className="chart-export-surface" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chart === "pie" ? (
                <PieChart>
                  <Pie data={chartRows} dataKey="revenue" nameKey="label" innerRadius={55} outerRadius={105} paddingAngle={2}>
                    {chartRows.map((row, index) => (
                      <Cell key={row.label} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={currencyTooltip} />
                  <Legend />
                </PieChart>
              ) : (
                <BarChart data={chartRows} margin={{ top: 8, right: 12, left: 0, bottom: 34 }}>
                  <XAxis dataKey="label" angle={-25} textAnchor="end" interval={0} height={70} tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => money(Number(value)).replace(".00", "")} width={80} />
                  <Tooltip formatter={currencyTooltip} />
                  <Bar dataKey="revenue" name="Revenue" radius={[8, 8, 0, 0]}>
                    {chartRows.map((row, index) => (
                      <Cell key={row.label} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="table-responsive mt-3">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="text-end">Revenue</th>
                  <th className="text-end">Entries</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className="text-end">{money(row.revenue)}</td>
                    <td className="text-end">{row.expense_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="alert alert-secondary mb-0">No data for this filter.</div>
      )}
    </section>
  );
}
