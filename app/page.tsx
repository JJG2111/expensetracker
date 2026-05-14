import ExpenseTable from "./ExpenseTable";
import PinnedAnalytics from "./PinnedAnalytics";
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

  return (
    <>
      <form id="export-report-form" method="post" action="/api/export" />
      <PinnedAnalytics />
      <ExpenseTable expenses={expenses} />
    </>
  );
}
