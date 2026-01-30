import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { isOrganiserPinConfigured, verifyOrganiserPin } from "@/lib/organiser";

const TEAM_LIMITS: Record<string, number> = {
  darks: 7,
  whites: 7,
  subs: 4,
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const { playerId, team, position, pin } = await request.json();

  if (!isOrganiserPinConfigured()) {
    return NextResponse.json(
      { error: "Organiser PIN is not configured." },
      { status: 500 }
    );
  }

  if (!verifyOrganiserPin(pin)) {
    return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
  }

  if (!playerId || !team) {
    return NextResponse.json(
      { error: "playerId and team are required." },
      { status: 400 }
    );
  }

  if (!Object.keys(TEAM_LIMITS).includes(team)) {
    return NextResponse.json({ error: "Invalid team." }, { status: 400 });
  }

  const supabase = supabaseServer();

  const { data: gameweek, error: gameweekError } = await supabase
    .from("gameweeks")
    .select("status")
    .eq("id", gameweekId)
    .single();

  if (gameweekError || !gameweek) {
    return NextResponse.json({ error: "Gameweek not found." }, { status: 404 });
  }

  if (gameweek.status !== "open") {
    return NextResponse.json(
      { error: "Gameweek is locked." },
      { status: 403 }
    );
  }

  const { data: entries, error: entriesError } = await supabase
    .from("gameweek_players")
    .select("player_id, team")
    .eq("gameweek_id", gameweekId);

  if (entriesError || !entries) {
    return NextResponse.json(
      { error: "Failed to fetch team data." },
      { status: 500 }
    );
  }

  const current = entries.find((entry) => entry.player_id === playerId);
  const counts = entries.reduce(
    (acc: Record<string, number>, entry) => {
      acc[entry.team] = (acc[entry.team] || 0) + 1;
      return acc;
    },
    { darks: 0, whites: 0, subs: 0 }
  );

  if (current?.team !== team && counts[team] >= TEAM_LIMITS[team]) {
    return NextResponse.json(
      { error: `Team ${team} is full.` },
      { status: 409 }
    );
  }

  const updatePayload: Record<string, number | string> = { team };
  if (typeof position === "number") {
    updatePayload.position = position;
  }

  const { error } = await supabase
    .from("gameweek_players")
    .update(updatePayload)
    .eq("gameweek_id", gameweekId)
    .eq("player_id", playerId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update player." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
