"use client"

import useSWR from "swr"
import { Suspense } from "react"
import { NewProjectDialog } from "@/components/new-project-dialog"
import { ProjectCard } from "@/components/project-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Database, FolderOpen } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function ProjectsListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-lg" />
      ))}
    </div>
  )
}

function ProjectsList({ data, mutate }: { data: any; mutate: () => void }) {
  if (!data) return <ProjectsListSkeleton />

  if (data?.projects?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a project and upload your source code to get started.
          </p>
        </div>
        <NewProjectDialog onCreated={() => mutate()} />
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.projects?.map(
          (project: {
            id: string
            name: string
            description: string | null
            status: string
            file_count: number
            table_count: number
            created_at: string
          }) => (
            <ProjectCard key={project.id} project={project} />
          )
        )}
      </div>

      {data?.projects?.length > 0 && (
        <div className="mt-8 flex items-center gap-4 rounded-lg border bg-card p-4">
          <Database className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {data.projects.length} project
              {data.projects.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.projects.filter(
                (p: { status: string }) => p.status === "completed"
              ).length}{" "}
              completed
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default function DashboardPage() {
  const { data, isLoading, mutate } = useSWR("/api/projects", fetcher)

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Upload source code to trace database column lineage
          </p>
        </div>
        <NewProjectDialog onCreated={() => mutate()} />
      </div>

      <div className="mt-8">
        <Suspense fallback={<ProjectsListSkeleton />}>
          <ProjectsList data={data} mutate={mutate} />
        </Suspense>
      </div>
    </div>
  )
}
