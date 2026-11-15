import { Suspense } from "react";
import ResultsPageClient from "@/components/ResultsPageClient";
import { getResultsOverview } from "@/lib/resultsOverview";
import { supabaseServer } from "@/lib/supabase";

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="ui-skeleton h-24" />
      <div className="ui-skeleton h-72" />
    </div>
  );
}

async function Results({ gameweekId }: { gameweekId?: string }) {
  // Server-fetched so the result is in the first byte; SWR uses it as
  // fallbackData and takes over for client-side gameweek navigation.
  const overview = await getResultsOverview(supabaseServer(), gameweekId ?? null);
  return <ResultsPageClient fallback={overview} fallbackGameweekId={gameweekId ?? null} />;
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ gameweekId?: string }>;
}) {
  const { gameweekId } = await searchParams;
  return (
    <Suspense key={gameweekId ?? "latest"} fallback={<ResultsSkeleton />}>
      <Results gameweekId={gameweekId} />
    </Suspense>
  );
}
