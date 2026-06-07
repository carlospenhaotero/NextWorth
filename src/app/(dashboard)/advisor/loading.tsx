import { Skeleton } from "@/components/ui/skeleton";

export default function AdvisorLoading() {
  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Left: chat */}
        <div className="glass-card min-h-0 h-full flex flex-col gap-4">
          <Skeleton className="h-4 w-32" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-16 w-3/4 rounded-xl" />
            <Skeleton className="h-16 w-2/3 rounded-xl ml-auto" />
            <Skeleton className="h-16 w-3/4 rounded-xl" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        {/* Right: KPIs + allocation + insights */}
        <div className="min-h-0 h-full flex flex-col gap-4">
          {/* KPI header */}
          <div className="glass-card flex flex-wrap items-center justify-between gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-28" />
              </div>
            ))}
          </div>

          {/* Stacked allocation */}
          <div className="glass-card flex-1 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>

          {/* Insights */}
          <div className="glass-card space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
