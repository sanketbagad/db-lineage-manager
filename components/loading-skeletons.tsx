import { Skeleton } from "@/components/ui/skeleton"

export function LineageFlowSkeleton() {
  return (
    <div className="w-full h-[750px] rounded-xl border-2 border-border/50 bg-card/80 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-64" />
        <div className="mt-8 flex gap-4">
          <Skeleton className="h-64 w-48" />
          <Skeleton className="h-64 w-48" />
          <Skeleton className="h-64 w-48" />
        </div>
      </div>
    </div>
  )
}

export function ColumnMapSkeleton() {
  return (
    <div className="w-full space-y-4">
      <Skeleton className="h-8 w-full" />
      <div className="grid grid-cols-1 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  )
}

export function SchemaViewerSkeleton() {
  return (
    <div className="w-full space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  )
}

export function FileBrowserSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-24" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full rounded-md" />
    </div>
  )
}

export function JobsStatusSkeleton() {
  return (
    <div className="w-full space-y-3">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

export function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-96" />
        <LineageFlowSkeleton />
      </div>
    </div>
  )
}
