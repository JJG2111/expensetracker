export function hasDatabaseUrl() {
  const value = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING || "";
  const isPlaceholder = value.includes("user:password") || value.includes("...") || value.endsWith("/database");
  const isLocalhost = value.includes("@localhost") || value.includes("@127.0.0.1");
  return Boolean(value) && !isPlaceholder && !(process.env.VERCEL && isLocalhost);
}

export function DatabaseSetupCard() {
  return (
    <section className="card">
      <h2>Database Setup Required</h2>
      <p className="muted">
        This Vercel app needs a Postgres connection string before it can save earnings or load reports.
      </p>
      <p>Add this value in <code>.env.local</code> for local development, and in Vercel Project Settings for deployment:</p>
      <pre>POSTGRES_URL=&quot;postgres://...&quot;</pre>
      <p className="muted">
        On Vercel this must be a hosted Postgres URL. A local Docker URL like localhost:5432 only works on your laptop.
      </p>
    </section>
  );
}
