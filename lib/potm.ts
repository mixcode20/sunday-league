import "server-only";
import { supabaseServer } from "@/lib/supabase";
import { getGameweekDateTime, hasGameweekStarted } from "@/lib/utils";

export type PotmVotingWindow = {
  closed: boolean;
  closesAt: Date | null;
};

/**
 * POTM voting for a gameweek closes once the next gameweek's kickoff arrives.
 */
export const getPotmVotingWindow = async (
  supabase: ReturnType<typeof supabaseServer>,
  gameDate: string
): Promise<PotmVotingWindow> => {
  const { data: nextGameweek } = await supabase
    .from("gameweeks")
    .select("game_date, game_time")
    .gt("game_date", gameDate)
    .order("game_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextGameweek) return { closed: false, closesAt: null };

  return {
    closed: hasGameweekStarted(nextGameweek.game_date, nextGameweek.game_time),
    closesAt: getGameweekDateTime(nextGameweek.game_date, nextGameweek.game_time),
  };
};

export const isPotmVotingClosed = async (
  supabase: ReturnType<typeof supabaseServer>,
  gameDate: string
): Promise<boolean> => (await getPotmVotingWindow(supabase, gameDate)).closed;

/**
 * "today" / "tomorrow" when close, otherwise a short weekday (e.g. "Sun").
 */
export const formatPotmClosesLabel = (closesAt: Date, now = new Date()): string => {
  const closesDay = new Date(closesAt.getFullYear(), closesAt.getMonth(), closesAt.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((closesDay.getTime() - today.getTime()) / 86_400_000);

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "tomorrow";
  return closesAt.toLocaleDateString("en-US", { weekday: "short" });
};
