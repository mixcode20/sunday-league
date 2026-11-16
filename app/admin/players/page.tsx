import { Suspense } from "react";
import AdminPlayersClient from "@/components/AdminPlayersClient";
import { listPlayers } from "@/lib/players";
import { supabaseServer } from "@/lib/supabase";

// Request-time, not build-time. Without this the roster is prerendered into
// admin/players.html at build, so creating or archiving a player showed no
// change until the next deploy.
export const dynamic = "force-dynamic";

function PlayersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="ui-skeleton h-28" />
      <div className="ui-skeleton h-64" />
    </div>
  );
}

async function PlayersData() {
  const { data: players } = await listPlayers(supabaseServer());
  return <AdminPlayersClient players={players ?? []} />;
}

export default function AdminPlayersPage() {
  return (
    <Suspense fallback={<PlayersSkeleton />}>
      <PlayersData />
    </Suspense>
  );
}
