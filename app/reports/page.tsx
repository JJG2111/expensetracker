import { listReportHistory } from "../../lib/db";
import { DatabaseSetupCard, hasDatabaseUrl } from "../../lib/setup";
import { requireAuth } from "../../lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ReportsPage() {
  await requireAuth();

  if (!hasDatabaseUrl()) {
    return <DatabaseSetupCard />;
  }

  const reports = await listReportHistory();

  return (
    <table>
      <thead>
        <tr>
          <th>Report</th>
          <th>Generated</th>
          <th className="num">Size</th>
          <th>Download</th>
        </tr>
      </thead>
      <tbody>
        {reports.length ? (
          reports.map((report) => (
            <tr key={report.id}>
              <td>{report.filename}</td>
              <td>{new Date(report.created_at).toLocaleString()}</td>
              <td className="num">{Math.max(1, Math.round(report.size / 1024))} KB</td>
              <td>
                <a className="button" href={`/api/reports/${report.id}`}>
                  Download
                </a>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={4} className="empty">
              No reports generated yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
