import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      {Array.from({ length: 2 }).map((_, section) => (
        <div key={section} className="glass-card space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: section === 0 ? 3 : 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-28 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
