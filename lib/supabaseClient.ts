"use client";

import { createClient } from "@supabase/supabase-js";

const getClientConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Missing Supabase client env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return { supabaseUrl, supabasePublishableKey };
};

export const supabaseClient = () => {
  const { supabaseUrl, supabasePublishableKey } = getClientConfig();
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false },
  });
};
