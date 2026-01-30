import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { isOrganiserPinConfigured, verifyOrganiserPin } from "@/lib/organiser";

export async function POST(
  request: Request,
  { params }: { params: { gameweekId: string } }
) {
  const { darksScore, whitesScore, pin } = await request.json();

  if (!isOrganiserPinConfigured()) {
    return NextResponse.json(
      { error: "Organiser PIN is not configured." },
      { status: 500 }
    );
  }

  if (!verifyOrganiserPin(pin)) {
    return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
  }

  if (typeof darksScore !== "number" || typeof whitesScore !== "number") {
    return NextResponse.json(
      { error: "Scores must be numbers." },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  const { data: gameweek, error: gameweekError } = await supabase
    .from("gameweeks")
    .select("status")
    .eq("id", params.gameweekId)
    .single();

  if (gameweekError || !gameweek) {
    return NextResponse.json({ error: "Gameweek not found." }, { status: 404 });
  }

  if (gameweek.status !== "open") {
    return NextResponse.json(
      { error: "Gameweek is already locked." },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("gameweeks")
    .update({
      status: "locked",
      darks_score: darksScore,
      whites_score: whitesScore,
      locked_at: new Date().toISOString(),
    })
    .eq("id", params.gameweekId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to lock gameweek." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
