import { NextRequest, NextResponse } from "next/server";
import {
  getSelfRemovalCookieName,
  hasSelfRemovalAccess,
  parseSelfRemovalCookie,
} from "@/lib/selfRemovalCookie";
import { supabaseServer } from "@/lib/supabase";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  const { playerId, cancel } = await request.json();

  if (!playerId) {
    return NextResponse.json({ error: "playerId is required." }, { status: 400 });
  }

  if (
    !hasSelfRemovalAccess(
      parseSelfRemovalCookie(request.cookies.get(getSelfRemovalCookieName())?.value),
      gameweekId,
      playerId
    )
  ) {
    return NextResponse.json(
      { error: "You can only manage your own removal request from this browser." },
      { status: 403 }
    );
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from("gameweek_players")
    .update({ remove_requested: !cancel })
    .eq("gameweek_id", gameweekId)
    .eq("player_id", playerId);

  if (error) {
    return NextResponse.json(
      {
        error: cancel
          ? "Failed to cancel removal request."
          : "Failed to request removal.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
