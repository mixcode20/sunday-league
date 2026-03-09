import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { isOrganiserPinConfigured, verifyOrganiserPin } from "@/lib/organiser";

export async function POST(request: Request) {
  const { id, pin } = await request.json();

  if (!isOrganiserPinConfigured()) {
    return NextResponse.json(
      { error: "Organiser PIN is not configured." },
      { status: 500 }
    );
  }

  if (!verifyOrganiserPin(pin)) {
    return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ error: "Player id is required." }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, first_name, last_name, archived")
    .eq("id", id)
    .maybeSingle();

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 });
  }

  if (!player) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  if (player.archived) {
    return NextResponse.json({ error: "Player is already archived." }, { status: 409 });
  }

  const { data: archivedPlayer, error } = await supabase
    .from("players")
    .update({ archived: true })
    .eq("id", id)
    .select("id, first_name, last_name, archived")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, player: archivedPlayer });
}
