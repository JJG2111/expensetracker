import { money, months } from "../../lib/constants";
import ChartDownloadButton from "./ChartDownloadButton";

type MonthlyPartyOrder = {
  month: string;
  party: string;
  order_value: number;
};

const chartColors = ["#0f766e", "#2563eb", "#f97316", "#7c3aed", "#dc2626", "#0891b2", "#ca8a04", "#db2777"];

export default function PartyMonthlyHistogram({ rows, selectedMonths }: { rows: MonthlyPartyOrder[]; selectedMonths: string[] }) {
  const monthLabels = new Map<string, string>(months.map(([value, label]) => [value, label.slice(0, 3)]));
  const monthGroups = selectedMonths
    .slice()
    .sort()
    .map((month) => ({
      month,
      label: monthLabels.get(month) ?? month,
      parties: rows.filter((row) => row.month === month && row.order_value > 0).sort((left, right) => right.order_value - left.order_value)
    }))
    .map((group) => ({
      ...group,
      total: group.parties.reduce((sum, party) => sum + party.order_value, 0)
    }))
    .filter((group) => group.parties.length > 0);
  const maxValue = Math.max(...monthGroups.flatMap((group) => group.parties.map((party) => party.order_value)), 0);

  return (
    <section className="card p-3 p-md-4 mb-3">
      <div className="d-flex flex-column flex-sm-row gap-2 justify-content-between align-items-sm-start mb-3">
        <div>
          <h2 className="h4 fw-bold mb-1">Monthly Orders By Party</h2>
          <p className="text-secondary mb-0">Each month lists parties with order value for that month.</p>
        </div>
        {monthGroups.length > 0 && <ChartDownloadButton filename="monthly-orders-by-party" targetId="monthly-orders-by-party-chart" />}
      </div>
      {monthGroups.length ? (
        <>
          <div id="monthly-orders-by-party-chart" className="chart-export-surface monthly-party-grid">
            {monthGroups.map((group) => (
              <article className="monthly-party-card" key={group.month}>
                <div className="monthly-party-card-head">
                  <h3>{group.label}</h3>
                  <strong>{money(group.total)}</strong>
                </div>
                <div className="monthly-party-bars">
                  {group.parties.map((party, index) => (
                    <div className="monthly-party-row" key={`${group.month}-${party.party}`}>
                      <div className="monthly-party-label">
                        <span>{party.party}</span>
                        <strong>{money(party.order_value)}</strong>
                      </div>
                      <div className="monthly-party-track">
                        <div
                          className="monthly-party-fill"
                          style={{
                            background: chartColors[index % chartColors.length],
                            width: `${maxValue ? Math.max((party.order_value / maxValue) * 100, 4) : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="table-responsive mt-3">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Party</th>
                  <th className="text-end">Order Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.month}-${row.party}`}>
                    <td>{monthLabels.get(row.month) ?? row.month}</td>
                    <td>{row.party}</td>
                    <td className="text-end">{money(row.order_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="alert alert-secondary mb-0">No party order value for this filter.</div>
      )}
    </section>
  );
}
