import { companies } from "../../lib/constants";
import { requireAuth } from "../../lib/auth";
import { DatabaseSetupCard, hasDatabaseUrl } from "../../lib/setup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ImportPage({
  searchParams
}: {
  searchParams: Promise<{ imported?: string; skipped?: string; total?: string; error?: string }>;
}) {
  await requireAuth();

  if (!hasDatabaseUrl()) {
    return <DatabaseSetupCard />;
  }

  const params = await searchParams;

  return (
    <section className="card p-3 p-md-4">
      <div className="mb-4">
        <h1 className="h3 fw-bold mb-1">Import CSV Earnings</h1>
        <p className="text-secondary mb-0">
          Upload existing files like <code>01-ACC.csv</code>. You can select multiple files at once. Amount is calculated as <code>Qty * Commission</code>.
        </p>
      </div>

      {params.imported && (
        <div className="alert alert-success">
          Imported {params.imported} rows. Skipped {params.skipped ?? 0}. Total amount: {params.total ?? "0"}.
        </div>
      )}
      {params.error && <div className="alert alert-danger">{params.error}</div>}

      <form className="row g-3" method="post" action="/api/import" encType="multipart/form-data">
        <div className="col-12 col-md-4">
          <label className="form-label fw-semibold">Company</label>
          <select className="form-select" name="company" required>
            {Object.entries(companies).map(([code, company]) => (
              <option key={code} value={code}>
                {code} - {company.name}
              </option>
            ))}
          </select>
          <div className="form-text">Pick the company represented by the CSV, for example ACC.</div>
        </div>

        <div className="col-12 col-md-8">
          <label className="form-label fw-semibold">CSV Files</label>
          <input className="form-control" type="file" name="file" accept=".csv,text/csv" multiple required />
          <div className="form-text">Expected columns: Product Name, Date, Qty, Commission, Party Name.</div>
        </div>

        <div className="col-12">
          <button className="btn btn-primary" type="submit">
            Import CSV
          </button>
        </div>
      </form>
    </section>
  );
}
