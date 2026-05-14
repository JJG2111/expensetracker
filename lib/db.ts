import { Pool, type QueryResultRow } from "pg";

export type Expense = {
  id: number;
  company_code: string;
  expense_date: string;
  product_name: string;
  qty: number;
  commission: number;
  party_name: string;
  created_at: string;
};

export type SuggestionField = "product" | "party";
export type AnalyticsChartType = "bar" | "pie" | "histogram" | "line";
export type PinnedChart = {
  chart: AnalyticsChartType;
  year: string;
  months: string[];
};

let schemaReady = false;

declare global {
  // eslint-disable-next-line no-var
  var expenseReportsPool: Pool | undefined;
}

function pool() {
  if (!globalThis.expenseReportsPool) {
    const connectionString = process.env.POSTGRES_URL;
    const isLocal = connectionString?.includes("localhost") || connectionString?.includes("127.0.0.1");
    globalThis.expenseReportsPool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false }
    });
  }

  return globalThis.expenseReportsPool;
}

async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  return pool().query<T>(text, params);
}

function suggestionColumn(field: SuggestionField) {
  return field === "product" ? "product_name" : "party_name";
}

async function canonicalExpenseName(field: SuggestionField, value: string) {
  await ensureSchema();
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const column = suggestionColumn(field);
  const result = await query<{ value: string }>(
    `
    SELECT ${column} AS value
    FROM expenses
    WHERE LOWER(${column}) = LOWER($1)
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [trimmed]
  );

  return result.rows[0]?.value ?? trimmed;
}

export async function searchSuggestions(field: SuggestionField, search: string) {
  await ensureSchema();
  const trimmed = search.trim();
  if (trimmed.length < 1) return [];

  const column = suggestionColumn(field);
  const result = await query<{ value: string }>(
    `
    SELECT value
    FROM (
      SELECT DISTINCT ON (LOWER(${column}))
        ${column} AS value,
        LOWER(${column}) AS normalized,
        created_at
      FROM expenses
      WHERE ${column} ILIKE $1
      ORDER BY LOWER(${column}), created_at DESC
    ) matches
    ORDER BY
      CASE WHEN value ILIKE $2 THEN 0 ELSE 1 END,
      value
    LIMIT 8
  `,
    [`%${trimmed}%`, `${trimmed}%`]
  );

  return result.rows.map((row) => row.value);
}

export async function ensureSchema() {
  if (schemaReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      company_code TEXT NOT NULL,
      expense_date DATE NOT NULL,
      product_name TEXT NOT NULL,
      qty NUMERIC NOT NULL,
      commission NUMERIC NOT NULL,
      party_name TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await query("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date)");
  await query("CREATE INDEX IF NOT EXISTS idx_expenses_company_date ON expenses(company_code, expense_date)");
  await query(`
    CREATE TABLE IF NOT EXISTS report_history (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      bytes TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'report_history'
          AND column_name = 'bytes'
          AND udt_name = 'bytea'
      ) THEN
        ALTER TABLE report_history
        ALTER COLUMN bytes TYPE TEXT USING encode(bytes, 'base64');
      END IF;
    END $$;
  `);

  schemaReady = true;
}

export async function getPinnedChart() {
  await ensureSchema();
  const result = await query<{ value: PinnedChart }>("SELECT value FROM app_settings WHERE key = 'pinned_chart' LIMIT 1");
  return result.rows[0]?.value ?? null;
}

export async function savePinnedChart(input: PinnedChart) {
  await ensureSchema();
  await query(
    `
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('pinned_chart', $1::jsonb, NOW())
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `,
    [JSON.stringify(input)]
  );
}

export async function clearPinnedChart() {
  await ensureSchema();
  await query("DELETE FROM app_settings WHERE key = 'pinned_chart'");
}

export async function listExpenses() {
  await ensureSchema();
  const result = await query<Expense>(`
    SELECT
      id,
      company_code,
      expense_date::text,
      product_name,
      qty::float8 AS qty,
      commission::float8 AS commission,
      party_name,
      created_at::text
    FROM expenses
    ORDER BY expense_date, id
  `);
  return result.rows;
}

export async function getExpensesByIds(ids: number[]) {
  await ensureSchema();
  if (!ids.length) return [];

  const selectedIds = ids.map((id) => Number(id)).filter((id) => Number.isInteger(id));
  if (!selectedIds.length) return [];

  const result = await query<Expense>(
    `
    SELECT
      id,
      company_code,
      expense_date::text,
      product_name,
      qty::float8 AS qty,
      commission::float8 AS commission,
      party_name,
      created_at::text
    FROM expenses
    WHERE id = ANY($1::int[])
    ORDER BY expense_date, id
  `,
    [selectedIds]
  );
  return result.rows;
}

export async function createExpense(input: {
  companyCode: string;
  expenseDate: string;
  productName: string;
  qty: number;
  commission: number;
  partyName: string;
}) {
  await ensureSchema();
  const productName = await canonicalExpenseName("product", input.productName);
  const partyName = await canonicalExpenseName("party", input.partyName);
  const result = await query<Expense>(
    `
    INSERT INTO expenses (company_code, expense_date, product_name, qty, commission, party_name)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      company_code,
      expense_date::text,
      product_name,
      qty::float8 AS qty,
      commission::float8 AS commission,
      party_name,
      created_at::text
  `,
    [input.companyCode, input.expenseDate, productName, input.qty, input.commission, partyName]
  );
  return result.rows[0] ?? null;
}

export async function updateExpense(
  id: number,
  input: {
    companyCode: string;
    expenseDate: string;
    productName: string;
    qty: number;
    commission: number;
    partyName: string;
  }
) {
  await ensureSchema();
  const productName = await canonicalExpenseName("product", input.productName);
  const partyName = await canonicalExpenseName("party", input.partyName);
  const result = await query<Expense>(
    `
    UPDATE expenses
    SET
      company_code = $2,
      expense_date = $3,
      product_name = $4,
      qty = $5,
      commission = $6,
      party_name = $7
    WHERE id = $1
    RETURNING
      id,
      company_code,
      expense_date::text,
      product_name,
      qty::float8 AS qty,
      commission::float8 AS commission,
      party_name,
      created_at::text
  `,
    [id, input.companyCode, input.expenseDate, productName, input.qty, input.commission, partyName]
  );
  return result.rows[0] ?? null;
}

export async function deleteExpense(id: number) {
  await ensureSchema();
  await query("DELETE FROM expenses WHERE id = $1", [id]);
}

export async function availableYears() {
  await ensureSchema();
  const result = await query<{ year: string }>(`
    SELECT DISTINCT EXTRACT(YEAR FROM expense_date)::text AS year
    FROM expenses
    ORDER BY year DESC
  `);
  return result.rows.map((row) => row.year);
}

export async function distribution(groupBy: "party_name" | "product_name", year: string, months: string[]) {
  await ensureSchema();
  const selectedMonths = (months.length ? months : ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]).filter((month) =>
    /^\d{2}$/.test(month)
  );
  if (!selectedMonths.length) return [];

  const result =
    groupBy === "party_name"
      ? await query<{ label: string; revenue: number; expense_count: number }>(
          `
          SELECT
            party_name AS label,
            SUM(qty * commission)::float8 AS revenue,
            COUNT(*)::int AS expense_count
          FROM expenses
          WHERE EXTRACT(YEAR FROM expense_date)::text = $1
            AND LPAD(EXTRACT(MONTH FROM expense_date)::text, 2, '0') = ANY($2::text[])
          GROUP BY party_name
          ORDER BY revenue DESC, label
        `,
          [year, selectedMonths]
        )
      : await query<{ label: string; revenue: number; expense_count: number }>(
          `
          SELECT
            product_name AS label,
            SUM(qty * commission)::float8 AS revenue,
            COUNT(*)::int AS expense_count
          FROM expenses
          WHERE EXTRACT(YEAR FROM expense_date)::text = $1
            AND LPAD(EXTRACT(MONTH FROM expense_date)::text, 2, '0') = ANY($2::text[])
          GROUP BY product_name
          ORDER BY revenue DESC, label
        `,
          [year, selectedMonths]
        );

  return result.rows;
}

export async function analyticsTotal(year: string, months: string[]) {
  await ensureSchema();
  const selectedMonths = (months.length ? months : ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]).filter((month) =>
    /^\d{2}$/.test(month)
  );
  if (!selectedMonths.length) return { revenue: 0, expense_count: 0 };

  const result = await query<{ revenue: number | null; expense_count: number }>(
    `
    SELECT
      SUM(qty * commission)::float8 AS revenue,
      COUNT(*)::int AS expense_count
    FROM expenses
    WHERE EXTRACT(YEAR FROM expense_date)::text = $1
      AND LPAD(EXTRACT(MONTH FROM expense_date)::text, 2, '0') = ANY($2::text[])
  `,
    [year, selectedMonths]
  );
  return result.rows[0] ?? { revenue: 0, expense_count: 0 };
}

export async function partyMonthlyOrders(year: string, months: string[]) {
  await ensureSchema();
  const selectedMonths = (months.length ? months : ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]).filter((month) =>
    /^\d{2}$/.test(month)
  );
  if (!selectedMonths.length) return [];

  const result = await query<{ month: string; party: string; order_value: number }>(
    `
    SELECT
      LPAD(EXTRACT(MONTH FROM expense_date)::text, 2, '0') AS month,
      party_name AS party,
      SUM(qty * commission)::float8 AS order_value
    FROM expenses
    WHERE EXTRACT(YEAR FROM expense_date)::text = $1
      AND LPAD(EXTRACT(MONTH FROM expense_date)::text, 2, '0') = ANY($2::text[])
    GROUP BY month, party_name
    HAVING SUM(qty * commission) > 0
    ORDER BY month, order_value DESC, party
  `,
    [year, selectedMonths]
  );

  return result.rows;
}

export async function saveReportHistory(filename: string, contentType: string, bytes: Buffer) {
  await ensureSchema();
  await query(
    `
    INSERT INTO report_history (filename, content_type, bytes)
    VALUES ($1, $2, $3)
  `,
    [filename, contentType, bytes.toString("base64")]
  );
}

export async function listReportHistory() {
  await ensureSchema();
  const result = await query<{ id: number; filename: string; content_type: string; size: number; created_at: string }>(`
    SELECT
      id,
      filename,
      content_type,
      OCTET_LENGTH(bytes)::int AS size,
      created_at::text
    FROM report_history
    ORDER BY created_at DESC, id DESC
  `);
  return result.rows;
}

export async function getReportHistory(id: number) {
  await ensureSchema();
  const result = await query<{ filename: string; content_type: string; bytes: string }>(
    `
    SELECT filename, content_type, bytes
    FROM report_history
    WHERE id = $1
    LIMIT 1
  `,
    [id]
  );
  const report = result.rows[0];
  if (!report) return null;

  return {
    ...report,
    bytes: Buffer.from(report.bytes, "base64")
  };
}
