import ExpenseTable from "./ExpenseTable";
import { companies, money, users } from "../lib/constants";
import { listExpenses } from "../lib/db";
import { DatabaseSetupCard, hasDatabaseUrl } from "../lib/setup";
import { requireAuth } from "../lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  await requireAuth();

  if (!hasDatabaseUrl()) {
    return <DatabaseSetupCard />;
  }

  const expenses = await listExpenses();
  const total = expenses.reduce((sum, expense) => sum + expense.qty * expense.commission, 0);

  return (
    <>
      <section className="grid">
        <div className="card">
          <h2>Add Expense</h2>
          <form method="post" action="/api/expenses">
            <label>Company</label>
            <select name="company" required>
              {Object.entries(companies).map(([code, company]) => (
                <option key={code} value={code}>
                  {code} - {company.name}
                </option>
              ))}
            </select>

            <label>Product Name</label>
            <input name="productName" required />

            <label>Date</label>
            <input type="date" name="expenseDate" required />

            <label>Qty</label>
            <input name="qty" inputMode="decimal" required />

            <label>Commission</label>
            <input name="commission" inputMode="decimal" required />

            <label>Party Name</label>
            <input name="partyName" required />

            <button type="submit">Add Expense</button>
          </form>
        </div>
      </section>

      <div className="summary">
        <h2>All Expenses</h2>
        <strong>Total: {money(total)}</strong>
      </div>

      <form id="export-report-form" method="post" action="/api/export" />
      <div className="report-controls card">
        <div>
          <label>Report User</label>
          <select name="user" form="export-report-form" required>
            {Object.entries(users).map(([code, user]) => (
              <option key={code} value={code}>
                {code} - {user.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Report Date</label>
          <input type="date" name="reportDate" form="export-report-form" required />
        </div>

        <div>
          <label>Report Company</label>
          <select name="company" form="export-report-form" required>
            {Object.entries(companies).map(([code, company]) => (
              <option key={code} value={code}>
                {code} - {company.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Format</label>
          <select name="format" form="export-report-form">
            <option value="pdf">PDF (.pdf)</option>
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
        </div>

        <button type="submit" form="export-report-form">
          Export Report
        </button>
      </div>

      <ExpenseTable expenses={expenses} />
    </>
  );
}
