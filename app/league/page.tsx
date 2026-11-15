import { Suspense } from "react";
import LeaguePageClient from "@/components/LeaguePageClient";
import { getLeagueOverview } from "@/lib/leagueOverview";
import { supabaseServer } from "@/lib/supabase";

// Request-time: standings change when a gameweek is locked. Streaming (below)
// means this costs nothing in TTFB, so there is no need to cache and maintain
// invalidation across every mutation route.
export const dynamic = "force-dynamic";

function LeagueSkeleton() {
  return (
    <div className="space-y-4">
      <div className="ui-skeleton h-12" />
      <div className="ui-skeleton h-8 w-32" />
      <div className="ui-skeleton h-64" />
    </div>
  );
}

async function LeagueData() {
  const overview = await getLeagueOverview(supabaseServer());
  return <LeaguePageClient fallback={overview} />;
}

export default function LeaguePage() {
  // The shell flushes immediately; the table streams into the same response,
  // so the data still arrives without a second round trip.
  return (
    <Suspense fallback={<LeagueSkeleton />}>
      <LeagueData />
    </Suspense>
  );
}
