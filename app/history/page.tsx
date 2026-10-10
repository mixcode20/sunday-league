import { Suspense } from "react";
import ResultsPageClient from "@/components/ResultsPageClient";

export const dynamic = "force-dynamic";

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="ui-skeleton h-24" />
      <div className="ui-skeleton h-72" />
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <ResultsPageClient />
    </Suspense>
  );
}
