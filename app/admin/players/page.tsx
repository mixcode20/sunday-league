import AdminPlayersClient from "@/components/AdminPlayersClient";
import { listPlayers } from "@/lib/players";
import { supabaseServer } from "@/lib/supabase";

export default async function AdminPlayersPage() {
  const supabase = supabaseServer();
  const { data: players } = await listPlayers(supabase);

  return <AdminPlayersClient players={players ?? []} />;
}
