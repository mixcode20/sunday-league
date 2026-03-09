import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Player deletion is disabled. Archive players instead." },
    { status: 410 }
  );
}
