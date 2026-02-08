import { Suspense } from "react";
import ResultsPageClient from "@/components/ResultsPageClient";

export const dynamic = "force-dynamic";

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 rounded-3xl border border-slate-200 bg-white" />
      <div className="h-72 rounded-3xl border border-slate-200 bg-white" />
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
