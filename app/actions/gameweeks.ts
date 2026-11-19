"use server";

import { revalidatePath, updateTag } from "next/cache";
import { PLAYER_STATS_TAG } from "@/lib/cacheTags";
import { isOrganiserPinConfigured, verifyOrganiserPin } from "@/lib/organiser";
import { supabaseServer } from "@/lib/supabase";
import type { ActionResult } from "@/app/actions/players";

// Server Actions are publicly invocable, exactly like the routes they replace,
// so every one re-checks the organiser PIN.
const checkOrganiser = (pin: string): ActionResult | null => {
  if (!isOrganiserPinConfigured()) {
    return { ok: false, error: "Organiser PIN is not configured." };
  }
  if (!verifyOrganiserPin(pin)) {
    return { ok: false, error: "Invalid PIN." };
  }
  return null;
};

// Every gameweek view derives from the same rows. These are once-a-week
// organiser actions, so re-rendering the affected routes is cheap.
const revalidateGameweekViews = () => {
  revalidatePath("/");
  revalidatePath("/teams");
  revalidatePath("/league");
  revalidatePath("/history");
};

export async function updateGameweek(
  pin: string,
  gameweekId: string,
  input: { date: string; time?: string; location?: string; paymentLink?: string }
): Promise<ActionResult> {
  const denied = checkOrganiser(pin);
  if (denied) return denied;

  if (!gameweekId) return { ok: false, error: "Gameweek id is required." };
  if (!input.date) return { ok: false, error: "Date is required." };

  const safeTime =
    typeof input.time === "string" && input.time.trim().length > 0
      ? input.time.trim()
      : "9:15am";
  const safeLocation =
    typeof input.location === "string" && input.location.trim().length > 0
      ? input.location.trim()
      : "MH";
  const safePaymentLink =
    typeof input.paymentLink === "string" && input.paymentLink.trim().length > 0
      ? input.paymentLink.trim()
      : null;

  const supabase = supabaseServer();
  const { data: existing, error: lookupError } = await supabase
    .from("gameweeks")
    .select("id")
    .eq("id", gameweekId)
    .maybeSingle();

  if (lookupError) return { ok: false, error: lookupError.message };
  if (!existing) return { ok: false, error: "Gameweek not found." };

  const { error } = await supabase
    .from("gameweeks")
    .update({
      game_date: input.date,
      game_time: safeTime,
      location: safeLocation,
      payment_link: safePaymentLink,
    })
    .eq("id", gameweekId);

  if (error) {
    console.error("[updateGameweek] failed", { gameweekId, error });
    return { ok: false, error: error.message ?? "Failed to update gameweek." };
  }

  revalidateGameweekViews();
  return { ok: true };
}

export async function deleteGameweek(
  pin: string,
  gameweekId: string
): Promise<ActionResult> {
  const denied = checkOrganiser(pin);
  if (denied) return denied;

  if (!gameweekId) return { ok: false, error: "Gameweek id is required." };

  const supabase = supabaseServer();
  const { data: existing, error: lookupError } = await supabase
    .from("gameweeks")
    .select("id")
    .eq("id", gameweekId)
    .maybeSingle();

  if (lookupError) return { ok: false, error: lookupError.message };
  if (!existing) return { ok: false, error: "Gameweek not found." };

  // Entries first: the schema cascades from gameweeks, but deleting them
  // explicitly keeps the failure modes distinguishable, as the route did.
  const { error: entriesError } = await supabase
    .from("gameweek_players")
    .delete()
    .eq("gameweek_id", gameweekId);

  if (entriesError) {
    console.error("[deleteGameweek] entries delete failed", { gameweekId, error: entriesError });
    return {
      ok: false,
      error: entriesError.message ?? "Failed to delete gameweek entries.",
    };
  }

  const { error } = await supabase.from("gameweeks").delete().eq("id", gameweekId);
  if (error) {
    console.error("[deleteGameweek] failed", { gameweekId, error });
    return { ok: false, error: error.message ?? "Failed to delete gameweek." };
  }

  // Deleting a locked gameweek removes it from every participant's history.
  updateTag(PLAYER_STATS_TAG);
  revalidateGameweekViews();
  return { ok: true };
}
