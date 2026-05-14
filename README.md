# Expense Reports Vercel App

This is a separate Vercel-ready version of the local Python expense app. It does not modify or depend on the existing Python files.

## Stack

- Next.js App Router
- Hosted Postgres via `pg` (`POSTGRES_URL`)
- `exceljs` for XLSX export
- `pdf-lib` for PDF export
- Postgres-backed historical report storage

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and add a Postgres connection string. For local development you can use the included Docker database:

   ```bash
   docker compose up -d
   ```

   ```bash
   POSTGRES_URL="postgres://expense_user:expense_password@localhost:5432/expense_reports"
   ```

3. Run locally:

   ```bash
   npm run dev
   ```

The database schema is created automatically on first load.

## Deploy To Vercel

1. Push this `vercel-app` folder to GitHub, or set it as the Vercel project root.
2. In Vercel, create/connect a hosted Postgres database from the Marketplace, Neon, Supabase, or another provider.
3. Add `POSTGRES_URL` and `AUTH_SECRET` in Vercel Project Settings -> Environment Variables.
4. Deploy.

The app explicitly uses the Node.js runtime for all database and report-generation routes, which is required for the `pg`, `exceljs`, and `pdf-lib` code paths.

## GitHub Actions CI/CD

This repo includes `.github/workflows/vercel.yml`.

Required GitHub repository secrets:

- `POSTGRES_URL` - hosted Postgres connection string used for CI builds.
- `AUTH_SECRET` - long random string used to sign login cookies.
- `VERCEL_TOKEN` - Vercel account token.
- `VERCEL_ORG_ID` - Vercel team/user ID.
- `VERCEL_PROJECT_ID` - Vercel project ID.

The workflow:

- Builds every pull request to `main`.
- Deploys preview builds for pull requests.
- Deploys production on pushes to `main`.

You can get the Vercel IDs after linking locally:

```bash
npx vercel link
```

Then copy the values from `.vercel/project.json` into GitHub secrets.

This Vercel version starts fresh by design. Existing local CSV/SQLite data is not migrated automatically.
