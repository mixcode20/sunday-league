import LeaguePageClient from "@/components/LeaguePageClient";
import { getLeagueOverview } from "@/lib/leagueOverview";
import { supabaseServer } from "@/lib/supabase";

// Request-time, not build-time: otherwise the standings are frozen to the last
// deploy. Phase 4 should turn this into ISR + revalidateTag on gameweek lock.
export const dynamic = "force-dynamic";

export default async function LeaguePage() {
  // Server-fetched so the table is in the first byte. SWR still revalidates
  // against /api/league/overview on focus, using this as fallbackData.
  const overview = await getLeagueOverview(supabaseServer());
  return <LeaguePageClient fallback={overview} />;
}
