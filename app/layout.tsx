import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Private Books · Jignesh Gandhi",
  description: "Private bookkeeping for commissions, earnings, and reports."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <nav className="navbar navbar-expand app-nav">
            <Link className="navbar-brand app-brand" href="/" title="Jignesh Gandhi — private bookkeeping">
              <span className="app-brand-mark">₹</span>
              <span className="app-brand-text">Private Books · Jignesh</span>
            </Link>
            <div className="nav nav-pills app-nav-links">
              <Link className="nav-link" href="/">Earnings</Link>
              <Link className="nav-link" href="/analytics">Analytics</Link>
              <Link className="nav-link" href="/import">Import</Link>
              <Link className="nav-link" href="/reports">Reports</Link>
              <form method="post" action="/api/logout" style={{ display: "inline" }}>
                <button type="submit" className="nav-link app-nav-button">
                  Logout
                </button>
              </form>
            </div>
          </nav>
        </header>
        <main className="container-fluid app-main">{children}</main>
      </body>
    </html>
  );
}
