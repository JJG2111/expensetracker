import "./globals.css";

import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Expense Reports",
  description: "Expense reporting and analytics"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav>
            <Link className="brand" href="/">
              Expense Reports
            </Link>
            <div>
              <Link href="/">Expenses</Link>
              <Link href="/analytics">Analytics</Link>
              <Link href="/reports">Historical Reports</Link>
              <form method="post" action="/api/logout" style={{ display: "inline" }}>
                <button type="submit" className="nav-button">
                  Logout
                </button>
              </form>
            </div>
          </nav>
          <div className="hero">
            <h1>Expense Reports</h1>
            <p>Add expenses, select rows, export reports, and review analytics.</p>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
