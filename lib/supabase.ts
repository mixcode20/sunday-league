import "server-only";
import { createClient } from "@supabase/supabase-js";

const getServerConfig = () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase server env vars. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SECRET_KEY."
    );
  }

  return { supabaseUrl, supabaseServiceKey };
};

export const supabaseServer = () => {
  const { supabaseUrl, supabaseServiceKey } = getServerConfig();
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
};
