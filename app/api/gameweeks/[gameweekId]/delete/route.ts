import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { isOrganiserPinConfigured, verifyOrganiserPin } from "@/lib/organiser";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const { pin } = await request.json();

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

  const supabase = supabaseServer();

  const { data: gameweek, error: gameweekError } = await supabase
    .from("gameweeks")
    .select("id")
    .eq("id", gameweekId)
    .single();

  if (gameweekError || !gameweek) {
    console.error("[gameweek-delete] lookup failed", {
      gameweekId,
      error: gameweekError ?? null,
    });
    return NextResponse.json(
      { error: { code: "gameweek_not_found", message: "Gameweek not found." } },
      { status: 404 }
    );
  }

  const { error: entriesError } = await supabase
    .from("gameweek_players")
    .delete()
    .eq("gameweek_id", gameweekId);

  if (entriesError) {
    console.error("[gameweek-delete] failed to delete entries", {
      gameweekId,
      error: entriesError,
    });
    return NextResponse.json(
      {
        error: {
          code: entriesError.code ?? "entries_delete_failed",
          message: entriesError.message ?? "Failed to delete gameweek entries.",
          details: entriesError.details ?? null,
        },
      },
      { status: 500 }
    );
  }

  const { error } = await supabase.from("gameweeks").delete().eq("id", gameweekId);

  if (error) {
    console.error("[gameweek-delete] failed to delete gameweek", {
      gameweekId,
      error,
    });
    return NextResponse.json(
      {
        error: {
          code: error.code ?? "delete_failed",
          message: error.message ?? "Failed to delete gameweek.",
          details: error.details ?? null,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
