import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { isOrganiserPinConfigured, verifyOrganiserPin } from "@/lib/organiser";
import { deriveWinnerFromScores } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const payload = await request.json();
  const { pin } = payload;
  const resultMode = payload?.resultMode === "result" ? "result" : "score";

  if (!isOrganiserPinConfigured()) {
    return NextResponse.json(
      { error: "Organiser PIN is not configured." },
      { status: 500 }
    );
  }

  if (!verifyOrganiserPin(pin)) {
    return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
  }

  let darksScore: number | null = null;
  let whitesScore: number | null = null;
  let winner: "darks" | "whites" | "draw" | null = null;

  if (resultMode === "score") {
    if (
      typeof payload?.darksScore !== "number" ||
      typeof payload?.whitesScore !== "number" ||
      !Number.isInteger(payload.darksScore) ||
      !Number.isInteger(payload.whitesScore) ||
      payload.darksScore < 0 ||
      payload.whitesScore < 0
    ) {
      return NextResponse.json(
        { error: "Scores must be non-negative numbers." },
        { status: 400 }
      );
    }
    darksScore = payload.darksScore;
    whitesScore = payload.whitesScore;
    winner = deriveWinnerFromScores(darksScore, whitesScore);
  } else {
    if (
      payload?.winner !== "darks" &&
      payload?.winner !== "whites" &&
      payload?.winner !== "draw"
    ) {
      return NextResponse.json(
        { error: "A result option is required." },
        { status: 400 }
      );
    }
    winner = payload.winner;
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
      result_mode: resultMode,
      winner,
      locked_at: new Date().toISOString(),
    })
    .eq("id", gameweekId);

  if (error) {
    return NextResponse.json(
      {
        error: {
          code: error.code ?? "lock_failed",
          message: error.message ?? "Failed to lock gameweek.",
          details: error.details ?? null,
          hint: error.hint ?? null,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
