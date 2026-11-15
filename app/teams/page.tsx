import TeamsPageClient from "@/components/TeamsPageClient";
import { getGameOverview } from "@/lib/gameOverview";
import { supabaseServer } from "@/lib/supabase";

// Request-time: team assignments change while the organiser is editing.
export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  // /api/teams/overview runs the same queries and keeps its own error
  // handling; this only seeds the first paint.
  const { gameweek, entries, players } = await getGameOverview(supabaseServer());
  return <TeamsPageClient fallback={{ gameweek, entries, players }} />;
}
