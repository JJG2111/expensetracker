import { analyticsTotal, availableYears, distribution } from "../../lib/db";
import { money, months } from "../../lib/constants";
import { DatabaseSetupCard, hasDatabaseUrl } from "../../lib/setup";
import { requireAuth } from "../../lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const chartColors = ["#2563eb", "#16a34a", "#f97316", "#7c3aed", "#dc2626", "#0891b2", "#ca8a04", "#db2777"];

function Distribution({
  title,
  rows,
  chart
}: {
  title: string;
  rows: { label: string; revenue: number; expense_count: number }[];
  chart: "bar" | "pie";
}) {
  const maxRevenue = Math.max(...rows.map((row) => row.revenue), 0);
  const total = rows.reduce((sum, row) => sum + row.revenue, 0);
  let start = 0;
  const segments = rows.slice(0, 8).map((row, index) => {
    const percent = total ? (row.revenue / total) * 100 : 0;
    const end = start + percent;
    const segment = `${chartColors[index % chartColors.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    start = end;
    return segment;
  });

  return (
    <section className="card" style={{ marginBottom: 22 }}>
      <h2>{title}</h2>
      {chart === "pie" && rows.length > 0 && (
        <div className="chart-grid">
          <div className="pie-chart" style={{ "--segments": segments.join(", ") } as React.CSSProperties} />
          <div className="legend">
            {rows.slice(0, 8).map((row, index) => (
              <div className="legend-item" key={row.label}>
                <span className="swatch" style={{ background: chartColors[index % chartColors.length] }} />
                <span>{row.label}</span>
                <strong>{total ? ((row.revenue / total) * 100).toFixed(1) : "0"}%</strong>
              </div>
            ))}
          </div>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th className="num">Revenue</th>
            <th className="num">Expenses</th>
            <th>Distribution</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="num">{money(row.revenue)}</td>
                <td className="num">{row.expense_count}</td>
                <td>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${maxRevenue ? (row.revenue / maxRevenue) * 100 : 0}%` }} />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="empty">
                No data for this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export default async function Analytics({
  searchParams
}: {
  searchParams: Promise<{ year?: string; month?: string | string[]; chart?: string }>;
}) {
  await requireAuth();

  if (!hasDatabaseUrl()) {
    return <DatabaseSetupCard />;
  }

  const params = await searchParams;
  const years = await availableYears();
  const selectedYear = params.year && years.includes(params.year) ? params.year : years[0] ?? new Date().getFullYear().toString();
  const selectedMonths = Array.isArray(params.month) ? params.month : params.month ? [params.month] : months.map(([value]) => value);
  const chart = params.chart === "pie" ? "pie" : "bar";
  const partyRows = await distribution("party_name", selectedYear, selectedMonths);
  const productRows = await distribution("product_name", selectedYear, selectedMonths);
  const total = await analyticsTotal(selectedYear, selectedMonths);

  return (
    <>
      <form className="card filters" method="get" action="/analytics">
        <div>
          <label>Year</label>
          <select name="year" defaultValue={selectedYear}>
            {years.length ? years.map((year) => <option key={year}>{year}</option>) : <option>{selectedYear}</option>}
          </select>
        </div>
        <div>
          <label>Months</label>
          <select name="month" multiple defaultValue={selectedMonths}>
            {months.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p className="muted">Hold Command/Ctrl to select multiple months.</p>
        </div>
        <div>
          <label>Chart Type</label>
          <select name="chart" defaultValue={chart}>
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
        </div>
        <button type="submit">Apply Filters</button>
      </form>

      <section className="metric-grid">
        <div className="metric">
          <span>Total Revenue</span>
          <strong>{money(total.revenue ?? 0)}</strong>
        </div>
        <div className="metric">
          <span>Expense Rows</span>
          <strong>{total.expense_count}</strong>
        </div>
        <div className="metric">
          <span>Months Selected</span>
          <strong>{selectedMonths.length}</strong>
        </div>
      </section>

      <Distribution title="Revenue By Party" rows={partyRows} chart={chart} />
      <Distribution title="Revenue By Product" rows={productRows} chart={chart} />
    </>
  );
}
