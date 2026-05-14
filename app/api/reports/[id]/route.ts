import { NextResponse } from "next/server";

import { isAuthenticated } from "../../../../lib/auth";
import { getReportHistory } from "../../../../lib/db";
import { hasDatabaseUrl } from "../../../../lib/setup";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!hasDatabaseUrl()) {
    return new NextResponse("Database is not configured", { status: 503 });
  }

  const { id } = await params;
  const report = await getReportHistory(Number(id));

  if (!report) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = new ArrayBuffer(report.bytes.byteLength);
  new Uint8Array(body).set(report.bytes);

  return new NextResponse(body, {
    headers: {
      "Content-Type": report.content_type,
      "Content-Disposition": `attachment; filename="${report.filename}"`
    }
  });
}
