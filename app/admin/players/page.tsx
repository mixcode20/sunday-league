import AdminPlayersClient from "@/components/AdminPlayersClient";
import { supabaseServer } from "@/lib/supabase";

export default async function AdminPlayersPage() {
  const supabase = supabaseServer();
  const { data: players } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .order("first_name", { ascending: true });

  return <AdminPlayersClient players={players ?? []} />;
}
