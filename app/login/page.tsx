export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="login-shell">
      <section className="card login-card p-4">
        <h2 className="h3 fw-bold mb-2">Welcome Back</h2>
        <p className="text-secondary mb-4">Sign in to manage earnings, exports, and analytics.</p>
        {params.error && <div className="alert alert-danger">Invalid username or password.</div>}
        <form method="post" action="/api/login">
          <label className="form-label fw-semibold">Username</label>
          <input className="form-control mb-3" name="username" autoComplete="username" placeholder="admin" required />

          <label className="form-label fw-semibold">Password</label>
          <input className="form-control mb-3" name="password" type="password" autoComplete="current-password" placeholder="Enter password" required />

          <button type="submit" className="btn btn-primary w-100">
            Login
          </button>
        </form>
      </section>
    </div>
  );
}
