import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Database, FileCode, ArrowRight } from "lucide-react"

export function LineageFlowSkeleton() {
  return (
    <div className="w-full h-full min-h-[600px] rounded-xl border bg-card flex flex-col">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-3 p-3 border-b bg-muted/30">
        <Skeleton className="h-8 w-64" />
        <div className="h-5 w-px bg-border" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-24" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      
      {/* Loading content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="p-3 rounded-lg bg-muted/20">
              <Database className="h-6 w-6" />
            </div>
            <ArrowRight className="h-5 w-5 animate-pulse" />
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <ArrowRight className="h-5 w-5 animate-pulse" />
            <div className="p-3 rounded-lg bg-muted/20">
              <FileCode className="h-6 w-6" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Loading Lineage Data</p>
            <p className="text-xs text-muted-foreground mt-1">
              Fetching column usage information...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LineageLoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
      <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card border shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-sm font-medium">Generating Lineage</p>
          <p className="text-xs text-muted-foreground mt-1">
            This may take a moment...
          </p>
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
