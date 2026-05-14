import { analyticsTotal, availableYears, distribution, getPinnedChart, partyMonthlyOrders } from "../../lib/db";
import { money, months } from "../../lib/constants";
import { DatabaseSetupCard, hasDatabaseUrl } from "../../lib/setup";
import { requireAuth } from "../../lib/auth";
import DistributionChart from "./DistributionChart";
import PartyMonthlyLineChart from "./PartyMonthlyLineChart";
import PartyMonthlyHistogram from "./PartyMonthlyHistogram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const chart = params.chart === "pie" || params.chart === "histogram" || params.chart === "line" ? params.chart : "bar";
  const partyRows = await distribution("party_name", selectedYear, selectedMonths);
  const productRows = await distribution("product_name", selectedYear, selectedMonths);
  const monthlyPartyRows = chart === "histogram" || chart === "line" ? await partyMonthlyOrders(selectedYear, selectedMonths) : [];
  const total = await analyticsTotal(selectedYear, selectedMonths);
  const pinned = await getPinnedChart();
  const returnParams = new URLSearchParams();
  returnParams.set("year", selectedYear);
  returnParams.set("chart", chart);
  for (const month of selectedMonths) {
    returnParams.append("month", month);
  }
  const analyticsReturnTo = `/analytics?${returnParams.toString()}`;

  return (
    <>
      <form className="card p-3 p-md-4 mb-3" method="get" action="/analytics">
        <div className="row g-3 align-items-end">
        <div className="col-12 col-md-2">
          <label className="form-label fw-semibold">Year</label>
          <select className="form-select" name="year" defaultValue={selectedYear}>
            {years.length ? years.map((year) => <option key={year}>{year}</option>) : <option>{selectedYear}</option>}
          </select>
        </div>
        <div className="col-12 col-md-5">
          <label className="form-label fw-semibold">Months</label>
          <div className="month-checkbox-grid">
            {months.map(([value, label]) => (
              <label className="form-check month-check" key={value}>
                <input className="form-check-input" type="checkbox" name="month" value={value} defaultChecked={selectedMonths.includes(value)} />
                <span className="form-check-label">{label.slice(0, 3)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="col-12 col-md-3">
          <label className="form-label fw-semibold">Chart Type</label>
          <select className="form-select" name="chart" defaultValue={chart}>
            <option value="bar">Bar Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="histogram">Histogram</option>
            <option value="line">Contribution Chart</option>
          </select>
        </div>
        <div className="col-12 col-md-2">
          <button className="btn btn-primary w-100" type="submit">Apply Filters</button>
        </div>
        </div>
      </form>

      <section className="metric-grid">
        <div className="metric p-3">
          <span className="text-secondary">Total Revenue</span>
          <strong>{money(total.revenue ?? 0)}</strong>
        </div>
        <div className="metric p-3">
          <span className="text-secondary">Earning Rows</span>
          <strong>{total.expense_count}</strong>
        </div>
        <div className="metric p-3">
          <span className="text-secondary">Months Selected</span>
          <strong>{selectedMonths.length}</strong>
        </div>
      </section>

      <div className="d-flex flex-column flex-sm-row flex-wrap gap-2 justify-content-sm-end mb-3">
        <form className="d-flex" method="post" action="/api/pinned-chart">
          <input type="hidden" name="year" value={selectedYear} />
          <input type="hidden" name="chart" value={chart} />
          {selectedMonths.map((month) => (
            <input key={month} type="hidden" name="month" value={month} />
          ))}
          <button className="btn btn-outline-primary" type="submit">
            Pin this chart to Home
          </button>
        </form>
        {pinned ? (
          <form className="d-flex" method="post" action="/api/pinned-chart">
            <input type="hidden" name="intent" value="clear" />
            <input type="hidden" name="return_to" value={analyticsReturnTo} />
            <button className="btn btn-outline-danger" type="submit">
              Remove pinned chart from Home
            </button>
          </form>
        ) : null}
      </div>

      {chart === "histogram" ? (
        <PartyMonthlyHistogram rows={monthlyPartyRows} selectedMonths={selectedMonths} />
      ) : chart === "line" ? (
        <PartyMonthlyLineChart rows={monthlyPartyRows} selectedMonths={selectedMonths} />
      ) : (
        <>
          <DistributionChart title="Revenue By Party" rows={partyRows} chart={chart} />
          <DistributionChart title="Revenue By Product" rows={productRows} chart={chart} />
        </>
      )}
    </>
  );
}
