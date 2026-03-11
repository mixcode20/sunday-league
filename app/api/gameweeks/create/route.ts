import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { isOrganiserPinConfigured, verifyOrganiserPin } from "@/lib/organiser";

export async function POST(request: Request) {
  const { date, time, location, pin, playerIds } = await request.json();

  if (!isOrganiserPinConfigured()) {
    return NextResponse.json(
      { error: "Organiser PIN is not configured." },
      { status: 500 }
    );
  }

  if (!verifyOrganiserPin(pin)) {
    return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
  }

  if (!date) {
    return NextResponse.json({ error: "Date is required." }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data: openGameweek, error: openError } = await supabase
    .from("gameweeks")
    .select("id")
    .eq("status", "open")
    .maybeSingle();

  if (openError) {
    return NextResponse.json(
      { error: "Failed to check existing gameweek." },
      { status: 500 }
    );
  }

  if (openGameweek) {
    return NextResponse.json(
      { error: "The current gameweek is still active. Submit its result before creating the next one." },
      { status: 409 }
    );
  }

  const safeTime =
    typeof time === "string" && time.trim().length > 0 ? time.trim() : "9:15am";
  const safeLocation =
    typeof location === "string" && location.trim().length > 0
      ? location.trim()
      : "MH";
  const selectedPlayerIds = Array.isArray(playerIds)
    ? Array.from(
        new Set(
          playerIds.filter(
            (playerId): playerId is string =>
              typeof playerId === "string" && playerId.trim().length > 0
          )
        )
      )
    : [];

  const { data, error } = await supabase
    .from("gameweeks")
    .insert({
      game_date: date,
      game_time: safeTime,
      location: safeLocation,
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message || "Failed to create gameweek.",
        details: error.details ?? null,
        hint: error.hint ?? null,
      },
      { status: 500 }
    );
  }

  if (selectedPlayerIds.length > 0) {
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, archived")
      .in("id", selectedPlayerIds);

    if (playersError) {
      await supabase.from("gameweeks").delete().eq("id", data.id);
      return NextResponse.json(
        { error: playersError.message || "Failed to load selected players." },
        { status: 500 }
      );
    }

    const activePlayerIds = new Set(
      (players ?? [])
        .filter((player) => !player.archived)
        .map((player) => player.id)
    );

    if (activePlayerIds.size !== selectedPlayerIds.length) {
      await supabase.from("gameweeks").delete().eq("id", data.id);
      return NextResponse.json(
        { error: "One or more selected players are unavailable." },
        { status: 409 }
      );
    }

    const { error: seedError } = await supabase.from("gameweek_players").insert(
      selectedPlayerIds.map((playerId, index) => ({
        gameweek_id: data.id,
        player_id: playerId,
        team: "subs",
        position: index + 1,
      }))
    );

    if (seedError) {
      await supabase.from("gameweeks").delete().eq("id", data.id);
      return NextResponse.json(
        {
          error: seedError.message || "Failed to add selected players to the new gameweek.",
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ id: data.id });
}
