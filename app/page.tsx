import GamePageClient from "@/components/GamePageClient";
import { getGameOverview } from "@/lib/gameOverview";
import { supabaseServer } from "@/lib/supabase";

// Request-time, not build-time: the open gameweek and its slots change
// constantly. Phase 4 should revisit this with tag-based revalidation.
export const dynamic = "force-dynamic";

export default async function Home() {
  const overview = await getGameOverview(supabaseServer());
  return <GamePageClient fallback={overview} />;
}
