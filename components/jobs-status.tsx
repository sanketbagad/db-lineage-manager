"use client"

import React from "react"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react"

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

interface JobsStatusProps {
  jobs: Job[]
}

const jobLabels: Record<string, string> = {
  file_scan: "File Scanning",
  schema_parse: "Schema Parsing",
  lineage_trace: "Lineage Tracing",
  ai_describe: "AI Descriptions",
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />,
  completed: <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--chart-2))]" />,
  failed: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
}

export function JobsStatus({ jobs }: JobsStatusProps) {
  if (jobs.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Processing Jobs
      </h4>
      <div className="flex flex-col gap-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
          >
            {statusIcons[job.status]}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  {jobLabels[job.job_type] || job.job_type}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {job.status}
                </Badge>
              </div>
              {job.status === "running" && job.total > 0 && (
                <Progress
                  value={(job.progress / job.total) * 100}
                  className="mt-1.5 h-1"
                />
              )}
              {job.status === "completed" && (
                <span className="text-[10px] text-muted-foreground">
                  {job.progress} items processed
                </span>
              )}
              {job.status === "failed" && job.error_message && (
                <span className="text-[10px] text-destructive">
                  {job.error_message.slice(0, 100)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
