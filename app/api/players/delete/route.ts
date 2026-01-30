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
  const { error } = await supabase.from("players").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete player." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
