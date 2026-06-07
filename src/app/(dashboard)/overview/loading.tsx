import { Skeleton } from "@/components/ui/skeleton";

export default function OverviewLoading() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      {/* Chart card */}
      <div className="glass-card flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-12 rounded-lg" />
            ))}
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>

      {/* Top movers */}
      <div className="mt-6 border-t border-neutral-800 pt-6 space-y-4">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card !p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
