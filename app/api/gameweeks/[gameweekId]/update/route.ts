import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { isOrganiserPinConfigured, verifyOrganiserPin } from "@/lib/organiser";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const { date, time, location, pin } = await request.json();

  if (!isOrganiserPinConfigured()) {
    return NextResponse.json(
      { error: { code: "pin_missing", message: "Organiser PIN is not configured." } },
      { status: 500 }
    );
  }

  if (!verifyOrganiserPin(pin)) {
    return NextResponse.json(
      { error: { code: "pin_invalid", message: "Invalid PIN." } },
      { status: 401 }
    );
  }

  if (!date) {
    return NextResponse.json(
      { error: { code: "missing_date", message: "Date is required." } },
      { status: 400 }
    );
  }

  const safeTime =
    typeof time === "string" && time.trim().length > 0 ? time.trim() : "9:15am";
  const safeLocation =
    typeof location === "string" && location.trim().length > 0
      ? location.trim()
      : "MH";

  const supabase = supabaseServer();
  const { data: existing, error: lookupError } = await supabase
    .from("gameweeks")
    .select("id")
    .eq("id", gameweekId)
    .single();

  if (lookupError || !existing) {
    console.error("[gameweek-update] lookup failed", {
      gameweekId,
      error: lookupError ?? null,
    });
    return NextResponse.json(
      { error: { code: "gameweek_not_found", message: "Gameweek not found." } },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("gameweeks")
    .update({
      game_date: date,
      game_time: safeTime,
      location: safeLocation,
    })
    .eq("id", gameweekId);

  if (error) {
    console.error("[gameweek-update] update failed", {
      gameweekId,
      error,
    });
    return NextResponse.json(
      {
        error: {
          code: error.code ?? "update_failed",
          message: error.message ?? "Failed to update gameweek.",
          details: error.details ?? null,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
