import { Suspense } from "react";
import TeamsPageClient from "@/components/TeamsPageClient";
import { getGameOverview } from "@/lib/gameOverview";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function TeamsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="ui-skeleton h-24" />
      <div className="ui-skeleton h-64" />
    </div>
  );
}

async function TeamsData() {
  // /api/teams/overview runs the same queries and keeps its own error
  // handling; this only seeds the first paint.
  const { gameweek, entries, players } = await getGameOverview(supabaseServer());
  return <TeamsPageClient fallback={{ gameweek, entries, players }} />;
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<TeamsSkeleton />}>
      <TeamsData />
    </Suspense>
  );
}
