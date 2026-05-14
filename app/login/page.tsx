export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <section className="card" style={{ maxWidth: 460 }}>
      <h2>Admin Login</h2>
      {params.error && <div className="alert">Invalid username or password.</div>}
      <form method="post" action="/api/login">
        <label>Username</label>
        <input name="username" autoComplete="username" required />

        <label>Password</label>
        <input name="password" type="password" autoComplete="current-password" required />

        <button type="submit">Login</button>
      </form>
    </section>
  );
}
