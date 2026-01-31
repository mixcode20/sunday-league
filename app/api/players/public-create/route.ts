import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(request: Request) {
  const { firstName, lastName } = await request.json();

  const trimmedFirst = String(firstName ?? "").trim();
  const trimmedLast = String(lastName ?? "").trim();

  if (!trimmedFirst || !trimmedLast) {
    return NextResponse.json(
      { error: "First and last name are required." },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("players")
    .insert({ first_name: trimmedFirst, last_name: trimmedLast })
    .select("id, first_name, last_name")
    .single();

  if (error) {
    const message =
      error.code === "23505"
        ? "Player already exists."
        : "Failed to create player.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ player: data });
}
