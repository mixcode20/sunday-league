import Link from "next/link";
import PotmVoteFlow from "@/components/PotmVoteFlow";
import { isPotmVotingClosed } from "@/lib/potm";
import { supabaseServer } from "@/lib/supabase";
import { formatGameweekDate } from "@/lib/utils";

export default async function VotePage({
  params,
}: {
  params: Promise<{ gameweekId: string }>;
}) {
  const { gameweekId } = await params;
  const supabase = supabaseServer();
  const { data: gameweek } = await supabase
    .from("gameweeks")
    .select("id, game_date, status, darks_score, whites_score")
    .eq("id", gameweekId)
    .maybeSingle();

  if (!gameweek) {
    return (
      <div className="ui-card mx-auto max-w-lg p-6 text-center">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">Gameweek not found</h2>
        <Link href="/history" className="ui-btn ui-btn-secondary mt-4 inline-flex">
          Back to results
        </Link>
      </div>
    );
  }

  if (gameweek.status !== "locked") {
    return (
      <div className="ui-card mx-auto max-w-lg p-6 text-center">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">Voting isn&apos;t open yet</h2>
        <p className="mt-1.5 text-sm text-[var(--color-text-secondary)]">
          Player of the Match voting opens once the result is confirmed.
        </p>
        <Link href="/history" className="ui-btn ui-btn-secondary mt-4 inline-flex">
          Back to results
        </Link>
      </div>
    );
  }

  const votingClosed = await isPotmVotingClosed(supabase, gameweek.game_date);

  return (
    <PotmVoteFlow
      gameweekId={gameweek.id}
      gameDate={gameweek.game_date}
      gameweekLabel={formatGameweekDate(gameweek.game_date)}
      darksScore={gameweek.darks_score}
      whitesScore={gameweek.whites_score}
      votingClosed={votingClosed}
    />
  );
}
