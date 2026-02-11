"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileCode, Table, Clock, ArrowRight } from "lucide-react"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string | null
    status: string
    file_count: number
    table_count: number
    created_at: string
  }
}

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-chart-3/15 text-[hsl(var(--chart-3))] border-[hsl(var(--chart-3))]/30",
  completed: "bg-chart-2/15 text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2))]/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter()

  return (
    <Card
      className="group cursor-pointer transition-colors hover:border-primary/40"
      onClick={() => router.push(`/dashboard/project/${project.id}`)}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <CardTitle className="text-base font-medium leading-tight text-balance">
          {project.name}
        </CardTitle>
        <Badge
          variant="outline"
          className={`shrink-0 text-[11px] ${statusColors[project.status] || ""}`}
        >
          {project.status}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <FileCode className="h-3.5 w-3.5" />
            {project.file_count} files
          </span>
          <span className="flex items-center gap-1.5">
            <Table className="h-3.5 w-3.5" />
            {project.table_count} tables
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {new Date(project.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
          View lineage <ArrowRight className="h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  )
}
