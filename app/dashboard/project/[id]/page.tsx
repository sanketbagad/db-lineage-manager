"use client"

import React, { useRef } from "react"

import { useState, useCallback, lazy, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileUpload } from "@/components/file-upload"
import { FileBrowser } from "@/components/file-browser"
import { LanguageLegend } from "@/components/language-legend"
import { UsageDetail } from "@/components/usage-detail"
import { JobsStatus } from "@/components/jobs-status"
import { LineageControls } from "@/components/lineage-controls"
import {
  ArrowLeft,
  Database,
  FileCode,
  GitBranch,
  Sparkles,
  Loader2,
  Table as TableIcon,
  AlertCircle,
  Trash2,
} from "lucide-react"
import { DeleteProjectDialog } from "@/components/delete-project-dialog"
import { toast } from "sonner"
import {
  LineageFlowSkeleton,
  ColumnMapSkeleton,
  SchemaViewerSkeleton,
  FileBrowserSkeleton,
} from "@/components/loading-skeletons"

// Lazy load heavy components
const LineageFlow = lazy(() =>
  import("@/components/lineage-flow").then((mod) => ({
    default: mod.LineageFlow,
  }))
)
const SchemaViewer = lazy(() =>
  import("@/components/schema-viewer").then((mod) => ({
    default: mod.SchemaViewer,
  }))
)
const ColumnMap = lazy(() =>
  import("@/components/column-map").then((mod) => ({
    default: mod.ColumnMap,
  }))
)

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const flowContainerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedUsage, setSelectedUsage] = useState<any>(null)
  const [usageDetailOpen, setUsageDetailOpen] = useState(false)
  const [isGeneratingDescriptions, setIsGeneratingDescriptions] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const { data, mutate, isLoading } = useSWR(`/api/projects/${id}`, fetcher, {
    refreshInterval: 5000,
  })

  // Build lineage URL based on selected table/column
  const lineageUrl = data?.project?.status === "completed"
    ? selectedTable
      ? `/api/projects/${id}/lineage?table=${encodeURIComponent(selectedTable)}${selectedColumn ? `&column=${encodeURIComponent(selectedColumn)}` : ""}`
      : `/api/projects/${id}/lineage`
    : null

  const { data: lineageData, mutate: mutateLineage, isLoading: isLineageLoading, isValidating: isLineageValidating } = useSWR(lineageUrl, fetcher)

  const handleUploadComplete = useCallback(() => {
    mutate()
    mutateLineage()
    toast.success("Source code processed successfully")
  }, [mutate, mutateLineage])

  const handleGenerateDescriptions = useCallback(async () => {
    setIsGeneratingDescriptions(true)
    try {
      const res = await fetch(`/api/projects/${id}/describe`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to generate descriptions")
      await mutate()
      await mutateLineage()
      toast.success("AI descriptions generated")
    } catch {
      toast.error("Failed to generate descriptions")
    } finally {
      setIsGeneratingDescriptions(false)
    }
  }, [id, mutate, mutateLineage])

  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true)
    try {
      await mutateLineage()
    } finally {
      setIsRegenerating(false)
    }
  }, [mutateLineage])

  const handleRetryJob = useCallback(async (jobId: string, jobType: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, jobType }),
      })
      if (!res.ok) throw new Error("Failed to retry job")
      await mutate()
      toast.success(`Retrying ${jobType}...`)
    } catch {
      toast.error("Failed to retry job")
    }
  }, [id, mutate])

  const handleDeleteProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmName: data?.project?.name }),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to delete project")
    }
    toast.success("Project deleted successfully")
    router.push("/dashboard")
  }, [id, data?.project?.name, router])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUsageClick = useCallback((usage: any) => {
    setSelectedUsage(usage)
    setUsageDetailOpen(true)
  }, [])

  const handleColumnClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (column: any, tableName: string) => {
      // Set selected table and column for lineage generation
      setSelectedTable(tableName)
      setSelectedColumn(column.column_name)

      const usages = lineageData?.usages || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const columnUsage = usages.find(
        (u: any) =>
          u.column_name === column.column_name && u.table_name === tableName
      )
      if (columnUsage) {
        setSelectedUsage(columnUsage)
        setUsageDetailOpen(true)
      }
    },
    [lineageData]
  )

  const handleTableSelect = useCallback((tableName: string) => {
    setSelectedTable(tableName)
    setSelectedColumn(null) // Reset column when table changes
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedTable(null)
    setSelectedColumn(null)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data?.project) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Project not found</p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  const { project, files = [], schemas = [], jobs = [] } = data
  const usages = lineageData?.usages || []
  const statusColor: Record<string, string> = {
    pending: "hsl(var(--chart-3))",
    processing: "hsl(var(--chart-4))",
    completed: "hsl(var(--chart-2))",
    failed: "hsl(var(--destructive))",
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1800px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">
                {project.name}
              </h1>
              <Badge
                variant="outline"
                style={{
                  color: statusColor[project.status] || "hsl(var(--muted-foreground))",
                  borderColor: statusColor[project.status] || "hsl(var(--border))",
                }}
              >
                {project.status}
              </Badge>
            </div>
            {project.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {schemas.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 bg-transparent"
              onClick={handleGenerateDescriptions}
              disabled={isGeneratingDescriptions}
            >
              {isGeneratingDescriptions ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate AI Descriptions
            </Button>
          )}
          <DeleteProjectDialog
            projectName={project.name}
            onDelete={handleDeleteProject}
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </DeleteProjectDialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<FileCode className="h-4 w-4" />}
          label="Source Files"
          value={files.length}
        />
        <StatCard
          icon={<Database className="h-4 w-4" />}
          label="Tables"
          value={schemas.length}
        />
        <StatCard
          icon={<GitBranch className="h-4 w-4" />}
          label="Column Usages"
          value={usages.length}
        />
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Languages"
          value={new Set(files.map((f: any) => f.language)).size}
        />
      </div>

      {/* Processing Jobs */}
      {jobs.length > 0 && project.status !== "completed" && (
        <JobsStatus jobs={jobs} onRetry={handleRetryJob} />
      )}

      {/* Upload or Main Content */}
      {project.status === "pending" || project.status === "failed" ? (
        <div className="space-y-4">
          {project.status === "failed" && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Project processing failed</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Please try uploading your source code again or contact support if the issue persists.
              </p>
            </div>
          )}
          <FileUpload projectId={id} onUploadComplete={handleUploadComplete} />
        </div>
      ) : (
        <Tabs defaultValue="lineage" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="lineage" className="gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                Lineage Flow
              </TabsTrigger>
              <TabsTrigger value="column-map" className="gap-1.5">
                <Database className="h-3.5 w-3.5" />
                Column Map
              </TabsTrigger>
              <TabsTrigger value="schema" className="gap-1.5">
                <Database className="h-3.5 w-3.5" />
                Schema
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-1.5">
                <FileCode className="h-3.5 w-3.5" />
                Files
              </TabsTrigger>
              <TabsTrigger value="jobs" className="gap-1.5">
                <Loader2 className="h-3.5 w-3.5" />
                Jobs
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-4">
              <LanguageLegend files={files} />
              <LineageControls
                projectId={id}
                tableName={selectedTable || undefined}
                columnName={selectedColumn || undefined}
                onRegenerate={handleRegenerate}
                flowContainerRef={flowContainerRef}
                lineageData={lineageData?.lineage || lineageData}
                isRegenerating={isRegenerating}
              />
            </div>
          </div>

          {/* Selected Table/Column Indicator */}
          {selectedTable && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <TableIcon className="h-3 w-3" />
                {selectedTable}
                {selectedColumn && ` → ${selectedColumn}`}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
              {lineageData?.fromCache && (
                <Badge variant="outline" className="text-xs">
                  Cached
                </Badge>
              )}
            </div>
          )}

          <Separator className="my-4" />

          <TabsContent value="lineage" className="mt-0">
            <div ref={flowContainerRef} className="rounded-lg border bg-card overflow-hidden relative" style={{ height: "calc(100vh - 380px)", minHeight: "600px" }}>
              {isLineageLoading ? (
                <LineageFlowSkeleton />
              ) : (
                <Suspense fallback={<LineageFlowSkeleton />}>
                  <LineageFlow
                    usages={usages}
                    onUsageClick={handleUsageClick}
                  />
                </Suspense>
              )}
              {isLineageValidating && !isLineageLoading && (
                <div className="absolute top-3 right-3 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-md px-3 py-1.5 border shadow-sm z-50">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Refreshing...</span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="column-map" className="mt-0">
            <Suspense fallback={<ColumnMapSkeleton />}>
              <ColumnMap columnSummaries={lineageData?.columnSummaries || []} />
            </Suspense>
          </TabsContent>

          <TabsContent value="schema" className="mt-0">
            <Suspense fallback={<SchemaViewerSkeleton />}>
              <SchemaViewer
                schemas={schemas}
                onColumnClick={handleColumnClick}
                onTableSelect={handleTableSelect}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="files" className="mt-0">
            <Suspense fallback={<FileBrowserSkeleton />}>
              <FileBrowser files={files} />
            </Suspense>
          </TabsContent>

          <TabsContent value="jobs" className="mt-0">
            <JobsStatus jobs={jobs} />
          </TabsContent>
        </Tabs>
      )}

      {/* Usage Detail Sheet */}
      <UsageDetail
        usage={selectedUsage as never}
        open={usageDetailOpen}
        onClose={() => setUsageDetailOpen(false)}
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
