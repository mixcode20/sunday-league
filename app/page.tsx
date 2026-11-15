import { Suspense } from "react";
import GamePageClient from "@/components/GamePageClient";
import { getGameOverview } from "@/lib/gameOverview";
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
  const overview = await getGameOverview(supabaseServer());
  return <GamePageClient fallback={overview} />;
}

export default function Home() {
  return (
    <Suspense fallback={<GameSkeleton />}>
      <GameData />
    </Suspense>
  );
}
