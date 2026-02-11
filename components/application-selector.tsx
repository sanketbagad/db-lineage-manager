"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Building2 } from "lucide-react"
import { toast } from "sonner"

interface Application {
  id: string
  name: string
  description?: string
  project_count: number
}

interface ApplicationSelectorProps {
  selectedAppId?: string
  onSelect: (appId: string | undefined) => void
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function ApplicationSelector({
  selectedAppId,
  onSelect,
}: ApplicationSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newAppName, setNewAppName] = useState("")
  const [newAppDescription, setNewAppDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const { data, mutate } = useSWR<{ applications: Application[] }>(
    "/api/applications",
    fetcher
  )

  const applications = data?.applications || []

  const handleCreate = async () => {
    if (!newAppName.trim()) {
      toast.error("Application name is required")
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAppName.trim(),
          description: newAppDescription.trim() || undefined,
        }),
      })

      if (!res.ok) throw new Error("Failed to create application")

      const { application } = await res.json()
      await mutate()
      onSelect(application.id)
      setDialogOpen(false)
      setNewAppName("")
      setNewAppDescription("")
      toast.success("Application created successfully")
    } catch {
      toast.error("Failed to create application")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedAppId || "all"}
        onValueChange={(value) => onSelect(value === "all" ? undefined : value)}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select application" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Applications</SelectItem>
          {applications.map((app) => (
            <SelectItem key={app.id} value={app.id}>
              <span className="flex items-center gap-2">
                {app.name}
                <span className="text-xs text-muted-foreground">
                  ({app.project_count} projects)
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Application</DialogTitle>
            <DialogDescription>
              Create a new application to group related projects together.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="app-name">Name</Label>
              <Input
                id="app-name"
                placeholder="My Application"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="app-description">Description</Label>
              <Textarea
                id="app-description"
                placeholder="Optional description..."
                value={newAppDescription}
                onChange={(e) => setNewAppDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
