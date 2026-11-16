"use server";

import { revalidatePath } from "next/cache";
import { isOrganiserPinConfigured, verifyOrganiserPin } from "@/lib/organiser";
import { supabaseServer } from "@/lib/supabase";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Server Actions are publicly invocable endpoints, exactly like the routes they
// replace, so every one of them re-checks the organiser PIN. Never assume the
// caller is the UI.
const checkOrganiser = (pin: string): ActionResult | null => {
  if (!isOrganiserPinConfigured()) {
    return { ok: false, error: "Organiser PIN is not configured." };
  }
  if (!verifyOrganiserPin(pin)) {
    return { ok: false, error: "Invalid PIN." };
  }
  return null;
};

// The player list feeds the admin page and the join dropdown on /.
const revalidatePlayerViews = () => {
  revalidatePath("/admin/players");
  revalidatePath("/");
  revalidatePath("/league");
};

export async function createPlayer(
  pin: string,
  firstName: string,
  lastName: string
): Promise<ActionResult> {
  const denied = checkOrganiser(pin);
  if (denied) return denied;

  const trimmedFirst = String(firstName ?? "").trim();
  const trimmedLast = String(lastName ?? "").trim();
  if (!trimmedFirst) return { ok: false, error: "First name is required." };

  const { error } = await supabaseServer()
    .from("players")
    .insert({ first_name: trimmedFirst, last_name: trimmedLast })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Player already exists." : "Failed to create player.",
    };
  }

  revalidatePlayerViews();
  return { ok: true };
}

export async function updatePlayer(
  pin: string,
  id: string,
  firstName: string,
  lastName: string
): Promise<ActionResult> {
  const denied = checkOrganiser(pin);
  if (denied) return denied;

  if (!id) return { ok: false, error: "Player id is required." };
  const trimmedFirst = String(firstName ?? "").trim();
  const trimmedLast = String(lastName ?? "").trim();
  if (!trimmedFirst) return { ok: false, error: "First name is required." };

  const { error } = await supabaseServer()
    .from("players")
    .update({ first_name: trimmedFirst, last_name: trimmedLast })
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Player already exists." : "Failed to update player.",
    };
  }

  revalidatePlayerViews();
  return { ok: true };
}

export async function archivePlayer(pin: string, id: string): Promise<ActionResult> {
  const denied = checkOrganiser(pin);
  if (denied) return denied;

  if (!id) return { ok: false, error: "Player id is required." };

  const supabase = supabaseServer();
  const { data: player, error: lookupError } = await supabase
    .from("players")
    .select("id, archived")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) return { ok: false, error: lookupError.message };
  if (!player) return { ok: false, error: "Player not found." };
  if (player.archived) return { ok: false, error: "Player is already archived." };

  const { error } = await supabase
    .from("players")
    .update({ archived: true })
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePlayerViews();
  return { ok: true };
}
