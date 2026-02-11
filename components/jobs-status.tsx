"use client"

import React, { useMemo, createContext, useContext } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  RotateCcw,
  FileSearch,
  Database,
  GitBranch,
  Sparkles,
  ChevronRight,
} from "lucide-react"

// ============================================================================
// Types
// ============================================================================
interface Job {
  id: string
  job_type: string
  status: string
  progress: number
  total: number
  error_message: string | null
  started_at: string | null
  completed_at: string | null
}

interface JobConfig {
  label: string
  icon: React.ReactNode
  description: string
}

interface StatusConfig {
  icon: React.ReactNode
  color: string
  bgColor: string
}

// ============================================================================
// Configs
// ============================================================================
const jobConfig: Record<string, JobConfig> = {
  file_scan: {
    label: "File Scanning",
    icon: <FileSearch className="h-4 w-4" />,
    description: "Scanning uploaded files for source code",
  },
  schema_parse: {
    label: "Schema Parsing",
    icon: <Database className="h-4 w-4" />,
    description: "Extracting table and column definitions from SQL",
  },
  lineage_trace: {
    label: "Lineage Tracing",
    icon: <GitBranch className="h-4 w-4" />,
    description: "Tracing column usage across source files",
  },
  ai_describe: {
    label: "AI Descriptions",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Generating AI-powered column descriptions",
  },
}

const statusConfig: Record<string, StatusConfig> = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  running: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  completed: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
  },
  failed: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
}

// ============================================================================
// Compound Pattern - Context
// ============================================================================
interface JobsContextValue {
  jobs: Job[]
  sortedJobs: Job[]
  overallProgress: {
    completed: number
    failed: number
    total: number
    running: Job | undefined
  }
  onRetry?: (jobId: string, jobType: string) => void
  getJobConfig: (jobType: string) => JobConfig
  getStatusConfig: (status: string) => StatusConfig
}

const JobsContext = createContext<JobsContextValue | null>(null)

function useJobs() {
  const context = useContext(JobsContext)
  if (!context) {
    throw new Error("Jobs compound components must be used within Jobs.Root")
  }
  return context
}

// ============================================================================
// Utility Functions
// ============================================================================
function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return ""
  const start = new Date(startedAt).getTime()
  const end = completedAt ? new Date(completedAt).getTime() : Date.now()
  const duration = Math.round((end - start) / 1000)
  if (duration < 60) return `${duration}s`
  return `${Math.floor(duration / 60)}m ${duration % 60}s`
}

// ============================================================================
// Root Component - Provider
// ============================================================================
interface RootProps {
  children: React.ReactNode
  jobs: Job[]
  onRetry?: (jobId: string, jobType: string) => void
}

function Root({ children, jobs, onRetry }: RootProps) {
  const sortedJobs = useMemo(() => {
    const order: Record<string, number> = { running: 0, pending: 1, failed: 2, completed: 3 }
    return [...jobs].sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4))
  }, [jobs])

  const overallProgress = useMemo(() => {
    const completed = jobs.filter((j) => j.status === "completed").length
    const failed = jobs.filter((j) => j.status === "failed").length
    const running = jobs.find((j) => j.status === "running")
    return { completed, failed, total: jobs.length, running }
  }, [jobs])

  const getJobConfig = (jobType: string): JobConfig =>
    jobConfig[jobType] || { label: jobType, icon: <Clock className="h-4 w-4" />, description: "" }

  const getStatusConfig = (status: string): StatusConfig =>
    statusConfig[status] || statusConfig.pending

  if (jobs.length === 0) return null

  return (
    <JobsContext.Provider
      value={{ jobs, sortedJobs, overallProgress, onRetry, getJobConfig, getStatusConfig }}
    >
      <div className="space-y-4">{children}</div>
    </JobsContext.Provider>
  )
}

// ============================================================================
// Header Component
// ============================================================================
interface HeaderProps {
  title?: string
}

function Header({ title = "Processing Pipeline" }: HeaderProps) {
  const { overallProgress } = useJobs()

  return (
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
        <Loader2
          className={`h-4 w-4 ${overallProgress.running ? "animate-spin text-primary" : "text-muted-foreground"}`}
        />
        {title}
      </h4>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-emerald-600" />
          {overallProgress.completed}
        </span>
        {overallProgress.failed > 0 && (
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-destructive" />
            {overallProgress.failed}
          </span>
        )}
        <span>/ {overallProgress.total} jobs</span>
      </div>
    </div>
  )
}

// ============================================================================
// Pipeline Component - Visual progress bar
// ============================================================================
function Pipeline() {
  const { jobs } = useJobs()

  return (
    <div className="flex items-center gap-1 px-2">
      {jobs.map((job, idx) => (
        <React.Fragment key={job.id}>
          <div
            className={`h-2 flex-1 rounded-full transition-all ${
              job.status === "completed"
                ? "bg-emerald-500"
                : job.status === "running"
                  ? "bg-primary animate-pulse"
                  : job.status === "failed"
                    ? "bg-destructive"
                    : "bg-muted"
            }`}
          />
          {idx < jobs.length - 1 && (
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ============================================================================
// Card Component - Individual job card
// ============================================================================
interface CardProps {
  job: Job
}

function Card({ job }: CardProps) {
  const { onRetry, getJobConfig, getStatusConfig } = useJobs()
  const config = getJobConfig(job.job_type)
  const statusCfg = getStatusConfig(job.status)
  const progressPercent = job.total > 0 ? Math.round((job.progress / job.total) * 100) : 0

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        job.status === "running"
          ? "border-primary/30 bg-primary/5 shadow-sm"
          : job.status === "failed"
            ? "border-destructive/30 bg-destructive/5"
            : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-lg p-2 ${statusCfg.bgColor} ${statusCfg.color}`}>
          {config.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground">{config.label}</span>
            <Badge variant="outline" className={`text-[10px] capitalize ${statusCfg.color}`}>
              {job.status}
            </Badge>
            {job.started_at && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {formatDuration(job.started_at, job.completed_at)}
              </span>
            )}
          </div>

          {job.status === "pending" && (
            <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
          )}

          {job.status === "running" && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Processing {job.progress} of {job.total} items
                </span>
                <span className="font-medium text-primary">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}

          {job.status === "completed" && (
            <p className="text-xs text-emerald-600 mt-1">
              Successfully processed {job.progress} items
            </p>
          )}

          {job.status === "failed" && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-destructive">
                {job.error_message || "An unknown error occurred"}
              </p>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetry(job.id, job.job_type)}
                  className="h-7 text-xs gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry
                </Button>
              )}
            </div>
          )}
        </div>

        <div className={statusCfg.color}>{statusCfg.icon}</div>
      </div>
    </div>
  )
}

// ============================================================================
// CardList Component - Renders all job cards
// ============================================================================
function CardList() {
  const { sortedJobs } = useJobs()

  return (
    <div className="grid gap-3">
      {sortedJobs.map((job) => (
        <Card key={job.id} job={job} />
      ))}
    </div>
  )
}

// ============================================================================
// Compact Component - Compact single-line view
// ============================================================================
function Compact() {
  const { overallProgress, jobs } = useJobs()

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5">
        {overallProgress.running ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : overallProgress.failed > 0 ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          <CheckCircle className="h-4 w-4 text-emerald-600" />
        )}
        <span className="text-sm font-medium">
          {overallProgress.running
            ? jobConfig[overallProgress.running.job_type]?.label || "Processing"
            : overallProgress.failed > 0
              ? `${overallProgress.failed} failed`
              : "Complete"}
        </span>
      </div>
      <div className="flex-1">
        <Progress
          value={(overallProgress.completed / overallProgress.total) * 100}
          className="h-1.5"
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {overallProgress.completed}/{overallProgress.total}
      </span>
    </div>
  )
}

// ============================================================================
// Export Compound Components
// ============================================================================
export const Jobs = {
  Root,
  Header,
  Pipeline,
  Card,
  CardList,
  Compact,
}

// ============================================================================
// Convenience Component - Default full layout
// ============================================================================
interface JobsStatusProps {
  jobs: Job[]
  onRetry?: (jobId: string, jobType: string) => void
  compact?: boolean
}

export function JobsStatus({ jobs, onRetry, compact = false }: JobsStatusProps) {
  if (jobs.length === 0) return null

  if (compact) {
    return (
      <Jobs.Root jobs={jobs} onRetry={onRetry}>
        <Jobs.Compact />
      </Jobs.Root>
    )
  }

  return (
    <Jobs.Root jobs={jobs} onRetry={onRetry}>
      <Jobs.Header />
      <Jobs.Pipeline />
      <Jobs.CardList />
    </Jobs.Root>
  )
}
