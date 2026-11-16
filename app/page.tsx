import { Suspense } from "react";
import GamePageClient from "@/components/GamePageClient";
import { getGameLive } from "@/lib/gameOverview";
import { listPlayersWithGamesPlayed } from "@/lib/players";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function GameSkeleton() {
  return (
    <div className="space-y-4">
      <div className="ui-skeleton h-24" />
      <div className="space-y-3">
        <div className="ui-skeleton h-10" />
        <div className="ui-skeleton h-48" />
      </div>
    </div>
  );
}

async function GameData() {
  // Two payloads on different clocks: the live gameweek is polled, the roster
  // is not. Both are seeded here so the first paint still has everything.
  const supabase = supabaseServer();
  const [live, roster] = await Promise.all([
    getGameLive(supabase),
    listPlayersWithGamesPlayed(supabase, { activeOnly: true }),
  ]);
  return <GamePageClient fallback={live} rosterFallback={roster.data ?? []} />;
}

export default function Home() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <GameData />
    </Suspense>
  );
}
