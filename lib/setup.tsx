export function hasDatabaseUrl() {
  const value = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING || "";
  return Boolean(value) && !value.includes("user:password") && !value.includes("...") && !value.endsWith("/database");
}

export function DatabaseSetupCard() {
  return (
    <section className="card">
      <h2>Database Setup Required</h2>
      <p className="muted">
        This Vercel app needs a Postgres connection string before it can save expenses or load reports.
      </p>
      <p>Add this value in <code>.env.local</code> for local development, and in Vercel Project Settings for deployment:</p>
      <pre>POSTGRES_URL=&quot;postgres://...&quot;</pre>
      <p className="muted">You can create this from Vercel Storage, Neon, Supabase, or any hosted Postgres provider.</p>
    </section>
  );
}
