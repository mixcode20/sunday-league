import { Suspense } from "react";
import GamePageClient from "@/components/GamePageClient";
import { getGameLive } from "@/lib/gameOverview";
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
  // Only the live gameweek is sent with the page. The 9.7KB roster is fetched
  // client-side on intent toward a slot, since most visitors read the slots
  // and never open the picker.
  const live = await getGameLive(supabaseServer());
  return <GamePageClient fallback={live} />;
}

export default function Home() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <GameData />
    </Suspense>
  );
}
