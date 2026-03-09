import "server-only";

type ListedPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  archived: boolean;
};

const isArchivedColumnMissing = (error: { code?: string; message?: string } | null) => {
  if (!error) return false;
  return error.code === "42703" || error.message?.toLowerCase().includes("archived") === true;
};

export const listPlayers = async (
  supabase: any,
  options?: { activeOnly?: boolean }
): Promise<{
  data: ListedPlayer[];
  error: { code?: string; message?: string } | null;
  archivedSupported: boolean;
}> => {
  const activeOnly = options?.activeOnly ?? false;

  const archivedQuery = supabase
    .from("players")
    .select("id, first_name, last_name, archived");

  const archivedResult = activeOnly
    ? await archivedQuery.eq("archived", false).order("first_name", { ascending: true })
    : await archivedQuery.order("first_name", { ascending: true });

  if (!isArchivedColumnMissing(archivedResult.error)) {
    return {
      data:
        archivedResult.data?.map((player: ListedPlayer) => ({
          ...player,
          archived: Boolean(player.archived),
        })) ?? [],
      error: archivedResult.error,
      archivedSupported: true,
    };
  }

  const fallbackResult = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .order("first_name", { ascending: true });

  return {
    data:
      fallbackResult.data?.map((player: Omit<ListedPlayer, "archived">) => ({
        ...player,
        archived: false,
      })) ?? [],
    error: fallbackResult.error,
    archivedSupported: false,
  };
};
