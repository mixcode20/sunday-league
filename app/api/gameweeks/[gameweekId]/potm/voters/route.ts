import { NextRequest, NextResponse } from "next/server";
import { isOrganiserPinConfigured, verifyOrganiserPin } from "@/lib/organiser";
import { supabaseServer } from "@/lib/supabase";
import { formatPlayerName, normalizePlayerJoin } from "@/lib/utils";
import type { PotmVoterAudit, PotmVoterAuditEntry } from "@/lib/types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const { pin } = await request.json();

  if (!isOrganiserPinConfigured()) {
    return NextResponse.json(
      { error: "Organiser PIN is not configured." },
      { status: 500 }
    );
  }

  if (!verifyOrganiserPin(pin)) {
    return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
  }

  const supabase = supabaseServer();

  const { data: gameweek } = await supabase
    .from("gameweeks")
    .select("id")
    .eq("id", gameweekId)
    .maybeSingle();

  if (!gameweek) {
    return NextResponse.json({ error: "Gameweek not found." }, { status: 404 });
  }

  const [{ data: squad }, { data: votes }] = await Promise.all([
    supabase
      .from("gameweek_players")
      .select("player_id, team, players(id, first_name, last_name)")
      .eq("gameweek_id", gameweekId)
      .in("team", ["darks", "whites"]),
    supabase
      .from("potm_votes")
      .select("voter_player_id, voted_player_id")
      .eq("gameweek_id", gameweekId),
  ]);

  const players = (squad ?? []).map(normalizePlayerJoin).map((entry) => ({
    id: entry.player_id as string,
    team: entry.team as "darks" | "whites",
    name: entry.players
      ? formatPlayerName(entry.players as { first_name: string; last_name: string })
      : "Unknown player",
  }));

  const nameByPlayerId = new Map(players.map((player) => [player.id, player.name]));
  const voteByVoterId = new Map(
    (votes ?? []).map((vote) => [vote.voter_player_id as string, vote.voted_player_id as string])
  );

  const voters: PotmVoterAuditEntry[] = players
    .map((player) => {
      const votedPlayerId = voteByVoterId.get(player.id) ?? null;
      return {
        voterId: player.id,
        voterName: player.name,
        voterTeam: player.team,
        votedPlayerId,
        votedPlayerName: votedPlayerId
          ? nameByPlayerId.get(votedPlayerId) ?? "Unknown player"
          : null,
      };
    })
    .sort((a, b) => a.voterName.localeCompare(b.voterName));

  return NextResponse.json({ voters } satisfies PotmVoterAudit);
}
