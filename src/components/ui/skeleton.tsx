import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse bg-muted", className)}
      {...props}
    />
  )
}

// Card skeleton for dashboard cards
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card-brutalist space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-2 w-full" />
    </div>
  )
}

// Stats skeleton for horizontal scroll stats
function StatsSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex-shrink-0 w-28 border border-border p-3">
          <Skeleton className="h-3 w-12 mb-2" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

// Grid skeleton for weekly progress
function GridSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-1">
      {[...Array(7)].map((_, i) => (
        <Skeleton key={i} className="aspect-square" />
      ))}
    </div>
  )
}

export { Skeleton, CardSkeleton, StatsSkeleton, GridSkeleton }
