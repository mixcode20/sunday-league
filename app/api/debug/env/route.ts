import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  let supabaseUrlHost: string | null = null;
  if (supabaseUrl) {
    try {
      supabaseUrlHost = new URL(supabaseUrl).host;
    } catch {
      supabaseUrlHost = null;
    }
  }

  return NextResponse.json({
    supabaseUrlHost,
    hasPublishableKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    hasSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
  });
}
