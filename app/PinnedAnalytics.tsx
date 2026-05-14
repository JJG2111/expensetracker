import { distribution, getPinnedChart, partyMonthlyOrders } from "../lib/db";
import DistributionChart from "./analytics/DistributionChart";
import PartyMonthlyHistogram from "./analytics/PartyMonthlyHistogram";
import PartyMonthlyLineChart from "./analytics/PartyMonthlyLineChart";

export default async function PinnedAnalytics() {
  const pinned = await getPinnedChart();
  if (!pinned) return null;

  const unpinForm = (
    <form className="mb-2 d-flex justify-content-end" method="post" action="/api/pinned-chart">
      <input type="hidden" name="intent" value="clear" />
      <input type="hidden" name="return_to" value="/" />
      <button className="btn btn-outline-danger btn-sm" type="submit">
        Remove chart from Home
      </button>
    </form>
  );

  if (pinned.chart === "histogram" || pinned.chart === "line") {
    const rows = await partyMonthlyOrders(pinned.year, pinned.months);
    return (
      <section className="mb-3">
        {unpinForm}
        {pinned.chart === "histogram" ? (
          <PartyMonthlyHistogram rows={rows} selectedMonths={pinned.months} />
        ) : (
          <PartyMonthlyLineChart rows={rows} selectedMonths={pinned.months} />
        )}
      </section>
    );
  }

  const partyRows = await distribution("party_name", pinned.year, pinned.months);
  const productRows = await distribution("product_name", pinned.year, pinned.months);

  return (
    <section className="mb-3">
      {unpinForm}
      <DistributionChart title="Pinned Revenue By Party" rows={partyRows} chart={pinned.chart} />
      <DistributionChart title="Pinned Revenue By Product" rows={productRows} chart={pinned.chart} />
    </section>
  );
}
