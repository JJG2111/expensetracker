import { isAuthenticated } from "../../../lib/auth";
import { searchSuggestions, type SuggestionField } from "../../../lib/db";
import { hasDatabaseUrl } from "../../../lib/setup";

export const runtime = "nodejs";

function suggestionField(value: string | null): SuggestionField | null {
  return value === "product" || value === "party" ? value : null;
}

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return Response.json({ suggestions: [] }, { status: 401 });
  }

  if (!hasDatabaseUrl()) {
    return Response.json({ suggestions: [] }, { status: 503 });
  }

  const url = new URL(request.url);
  const field = suggestionField(url.searchParams.get("field"));
  const query = url.searchParams.get("q") ?? "";

  if (!field) {
    return Response.json({ suggestions: [] }, { status: 400 });
  }

  const suggestions = await searchSuggestions(field, query);
  return Response.json({ suggestions });
}
