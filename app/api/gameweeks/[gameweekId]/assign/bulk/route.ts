import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { isOrganiserPinConfigured, verifyOrganiserPin } from "@/lib/organiser";

const TEAM_LIMITS: Record<string, number> = {
  darks: 7,
  whites: 7,
  subs: Number.MAX_SAFE_INTEGER,
};

const isArchivedColumnMissing = (error: { code?: string; message?: string } | null) =>
  error?.code === "42703" || error?.message?.toLowerCase().includes("archived") === true;

type Assignment = {
  playerId: string;
  team: string;
  position?: number | null;
};

// Batched counterpart to ../route.ts. The teams editor used to POST one
// assignment at a time and each request re-ran the same validation queries, so
// picking a full side cost N sequential round trips. This validates once and
// applies every update in parallel.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const { assignments, pin, allowReassign } = (await request.json()) as {
    assignments?: Assignment[];
    pin?: string;
    allowReassign?: boolean;
  };

  if (!isOrganiserPinConfigured()) {
    return NextResponse.json(
      { error: "Organiser PIN is not configured." },
      { status: 500 }
    );
  }

  if (!verifyOrganiserPin(pin)) {
    return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
  }

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return NextResponse.json(
      { error: "assignments must be a non-empty array." },
      { status: 400 }
    );
  }

  for (const assignment of assignments) {
    if (!assignment?.playerId || !assignment?.team) {
      return NextResponse.json(
        { error: "Each assignment needs playerId and team." },
        { status: 400 }
      );
    }
    if (!Object.keys(TEAM_LIMITS).includes(assignment.team)) {
      return NextResponse.json(
        { error: `Invalid team: ${assignment.team}` },
        { status: 400 }
      );
    }
  }

  const supabase = supabaseServer();

  const [{ data: gameweek, error: gameweekError }, { data: entries, error: entriesError }] =
    await Promise.all([
      supabase.from("gameweeks").select("status").eq("id", gameweekId).single(),
      supabase
        .from("gameweek_players")
        .select("player_id, team, position, team_position")
        .eq("gameweek_id", gameweekId),
    ]);

  if (gameweekError || !gameweek) {
    return NextResponse.json({ error: "Gameweek not found." }, { status: 404 });
  }

  if (gameweek.status !== "open") {
    return NextResponse.json({ error: "Gameweek is locked." }, { status: 403 });
  }

  if (entriesError || !entries) {
    return NextResponse.json(
      {
        error: {
          code: "entries_fetch_failed",
          message: "Failed to fetch team data.",
          details: entriesError?.details ?? entriesError?.message ?? null,
        },
      },
      { status: 500 }
    );
  }

  const playerIds = assignments.map((assignment) => assignment.playerId);
  const playerLookup = await supabase
    .from("players")
    .select("id, archived")
    .in("id", playerIds);

  if (!isArchivedColumnMissing(playerLookup.error)) {
    if (playerLookup.error) {
      return NextResponse.json(
        { error: playerLookup.error.message ?? "Failed to load players." },
        { status: 500 }
      );
    }
    const found = new Map((playerLookup.data ?? []).map((p) => [p.id, p]));
    for (const playerId of playerIds) {
      const player = found.get(playerId);
      if (!player) {
        return NextResponse.json({ error: "Player not found." }, { status: 404 });
      }
      if (player.archived) {
        return NextResponse.json(
          { error: "Archived players cannot be assigned to team slots." },
          { status: 409 }
        );
      }
    }
  }

  // Validate the batch as a whole against capacity, counting the net effect
  // rather than checking each assignment against the pre-batch state.
  const teamByPlayer = new Map(entries.map((entry) => [entry.player_id, entry.team]));
  const counts: Record<string, number> = { darks: 0, whites: 0, subs: 0 };
  entries.forEach((entry) => {
    counts[entry.team] = (counts[entry.team] ?? 0) + 1;
  });

  for (const { playerId, team } of assignments) {
    const currentTeam = teamByPlayer.get(playerId);
    if (currentTeam === team) continue;
    if (currentTeam) counts[currentTeam] -= 1;
    counts[team] = (counts[team] ?? 0) + 1;
    teamByPlayer.set(playerId, team);
    if (counts[team] > TEAM_LIMITS[team]) {
      return NextResponse.json({ error: `Team ${team} is full.` }, { status: 409 });
    }
  }

  if (!allowReassign) {
    for (const { playerId, team, position } of assignments) {
      const current = entries.find((entry) => entry.player_id === playerId);
      if (!current || current.team === "subs") continue;
      if (
        current.team !== team ||
        (typeof position === "number" && current.team_position !== position)
      ) {
        return NextResponse.json(
          { error: "Player already assigned to a team slot. Clear the slot first." },
          { status: 409 }
        );
      }
    }
  }

  const results = await Promise.all(
    assignments.map(({ playerId, team, position }) =>
      supabase
        .from("gameweek_players")
        .update({
          team,
          team_position:
            team === "subs" || typeof position !== "number" ? null : position,
        })
        .eq("gameweek_id", gameweekId)
        .eq("player_id", playerId)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("[teams-assign-bulk] update failed", {
      gameweekId,
      error: failed.error,
    });
    return NextResponse.json(
      {
        error: {
          code: failed.error.code ?? "update_failed",
          message: failed.error.message ?? "Failed to update players.",
          details: failed.error.details ?? null,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, applied: assignments.length });
}
