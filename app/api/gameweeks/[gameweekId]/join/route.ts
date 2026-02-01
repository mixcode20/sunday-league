import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ gameweekId: string }> }
) {
  const { gameweekId } = await context.params;
  return NextResponse.json(
    {
      error: `Deprecated endpoint. Use /api/gameweeks/${gameweekId}/slots/claim instead.`,
    },
    { status: 410 }
  );
}
