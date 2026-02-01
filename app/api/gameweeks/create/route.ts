import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { isOrganiserPinConfigured, verifyOrganiserPin } from "@/lib/organiser";

export async function POST(request: Request) {
  const { date, time, location, pin } = await request.json();

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
      { error: "There is already an open gameweek." },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("gameweeks")
    .insert({
      game_date: date,
      game_time: time || "9:15am",
      location: location || "MH",
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

  return NextResponse.json({ id: data.id });
}
