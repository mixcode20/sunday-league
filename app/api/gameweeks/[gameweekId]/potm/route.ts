import { NextRequest, NextResponse } from "next/server";
import { isPotmVotingClosed } from "@/lib/potm";
import { supabaseServer } from "@/lib/supabase";
import { formatPlayerName, normalizePlayerJoin } from "@/lib/utils";
import type { PotmEligiblePlayer, PotmTallyEntry } from "@/lib/types";

const fetchEligiblePlayers = async (
  supabase: ReturnType<typeof supabaseServer>,
  gameweekId: string
): Promise<PotmEligiblePlayer[]> => {
  const { data } = await supabase
    .from("gameweek_players")
    .select("player_id, team, players(id, first_name, last_name)")
    .eq("gameweek_id", gameweekId)
    .in("team", ["darks", "whites"]);

  return (data ?? []).map(normalizePlayerJoin).map((entry) => ({
    id: entry.player_id as string,
    team: entry.team as "darks" | "whites",
    name: entry.players
      ? formatPlayerName(entry.players as { first_name: string; last_name: string })
      : "Unknown player",
  }));
};

const fetchVotedVoterIds = async (
  supabase: ReturnType<typeof supabaseServer>,
  gameweekId: string
): Promise<string[]> => {
  const { data } = await supabase
    .from("potm_votes")
    .select("voter_player_id")
    .eq("gameweek_id", gameweekId);

  return (data ?? []).map((row) => row.voter_player_id);
};

const computeTally = async (
  supabase: ReturnType<typeof supabaseServer>,
  gameweekId: string,
  eligiblePlayers: PotmEligiblePlayer[]
): Promise<{ tally: PotmTallyEntry[]; totalVotes: number }> => {
  const { data: votes } = await supabase
    .from("potm_votes")
    .select("voter_player_id, voted_player_id")
    .eq("gameweek_id", gameweekId);

  const teamByPlayerId = new Map(eligiblePlayers.map((player) => [player.id, player.team]));

  const counts = new Map<string, { votes: number; darksVotes: number; whitesVotes: number }>();
  (votes ?? []).forEach((vote) => {
    const current = counts.get(vote.voted_player_id) ?? { votes: 0, darksVotes: 0, whitesVotes: 0 };
    current.votes += 1;
    const voterTeam = teamByPlayerId.get(vote.voter_player_id);
    if (voterTeam === "darks") current.darksVotes += 1;
    else if (voterTeam === "whites") current.whitesVotes += 1;
    counts.set(vote.voted_player_id, current);
  });

  const tally = eligiblePlayers
    .map((player) => {
      const entryCounts = counts.get(player.id) ?? { votes: 0, darksVotes: 0, whitesVotes: 0 };
      return {
        playerId: player.id,
        name: player.name,
        votes: entryCounts.votes,
        darksVotes: entryCounts.darksVotes,
        whitesVotes: entryCounts.whitesVotes,
      };
    })
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));

  return { tally, totalVotes: votes?.length ?? 0 };
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const { searchParams } = new URL(request.url);
  const voterPlayerId = searchParams.get("voterPlayerId");
  const spectate = searchParams.get("spectate") === "true";

  const supabase = supabaseServer();

  const { data: gameweek } = await supabase
    .from("gameweeks")
    .select("id")
    .eq("id", gameweekId)
    .maybeSingle();

  if (!gameweek) {
    return NextResponse.json({ error: "Gameweek not found." }, { status: 404 });
  }

  const [eligiblePlayers, votedVoterIds] = await Promise.all([
    fetchEligiblePlayers(supabase, gameweekId),
    fetchVotedVoterIds(supabase, gameweekId),
  ]);

  if (voterPlayerId) {
    const { data: existingVote } = await supabase
      .from("potm_votes")
      .select("voted_player_id")
      .eq("gameweek_id", gameweekId)
      .eq("voter_player_id", voterPlayerId)
      .maybeSingle();

    if (existingVote) {
      const { tally, totalVotes } = await computeTally(supabase, gameweekId, eligiblePlayers);
      return NextResponse.json({
        eligiblePlayers,
        votedVoterIds,
        hasVoted: true,
        votedForId: existingVote.voted_player_id,
        tally,
        totalVotes,
      });
    }
  }

  if (spectate) {
    const { tally, totalVotes } = await computeTally(supabase, gameweekId, eligiblePlayers);
    return NextResponse.json({
      eligiblePlayers,
      votedVoterIds,
      hasVoted: false,
      votedForId: null,
      tally,
      totalVotes,
    });
  }

  return NextResponse.json({
    eligiblePlayers,
    votedVoterIds,
    hasVoted: false,
    votedForId: null,
    tally: [],
    totalVotes: 0,
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const payload = await request.json();
  const voterPlayerId = String(payload?.voterPlayerId ?? "").trim();
  const votedPlayerId = String(payload?.votedPlayerId ?? "").trim();

  if (!voterPlayerId || !votedPlayerId) {
    return NextResponse.json(
      { error: "Select who you are and who gets your vote." },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  const { data: gameweek } = await supabase
    .from("gameweeks")
    .select("status, game_date")
    .eq("id", gameweekId)
    .maybeSingle();

  if (!gameweek) {
    return NextResponse.json({ error: "Gameweek not found." }, { status: 404 });
  }

  if (gameweek.status !== "locked") {
    return NextResponse.json(
      { error: "Voting opens once the result is confirmed." },
      { status: 400 }
    );
  }

  if (await isPotmVotingClosed(supabase, gameweek.game_date)) {
    return NextResponse.json(
      { error: "Voting has closed for this gameweek." },
      { status: 400 }
    );
  }

  const eligiblePlayers = await fetchEligiblePlayers(supabase, gameweekId);
  const eligibleIds = new Set(eligiblePlayers.map((player) => player.id));

  if (!eligibleIds.has(voterPlayerId)) {
    return NextResponse.json(
      { error: "Only players who played this gameweek can vote." },
      { status: 403 }
    );
  }

  if (!eligibleIds.has(votedPlayerId)) {
    return NextResponse.json(
      { error: "You can only vote for someone who played this gameweek." },
      { status: 400 }
    );
  }

  if (voterPlayerId === votedPlayerId) {
    return NextResponse.json({ error: "You can't vote for yourself." }, { status: 400 });
  }

  const { error } = await supabase.from("potm_votes").insert({
    gameweek_id: gameweekId,
    voter_player_id: voterPlayerId,
    voted_player_id: votedPlayerId,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You've already voted for this gameweek." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to submit vote." }, { status: 500 });
  }

  const { tally, totalVotes } = await computeTally(supabase, gameweekId, eligiblePlayers);

  return NextResponse.json({
    ok: true,
    votedForId: votedPlayerId,
    tally,
    totalVotes,
  });
}

// Testing-only: lets a voter clear their own vote so the flow can be re-run.
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const payload = await request.json();
  const voterPlayerId = String(payload?.voterPlayerId ?? "").trim();

  if (!voterPlayerId) {
    return NextResponse.json({ error: "voterPlayerId is required." }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from("potm_votes")
    .delete()
    .eq("gameweek_id", gameweekId)
    .eq("voter_player_id", voterPlayerId);

  if (error) {
    return NextResponse.json({ error: "Failed to reset vote." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
