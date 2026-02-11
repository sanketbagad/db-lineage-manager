"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Database, LogOut, User } from "lucide-react"
import { toast } from "sonner"

export function AppHeader() {
  const { user } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    toast.success("Signed out")
    router.push("/")
  }

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-2.5"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <Database className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          DB Lineage
        </span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <User className="h-4 w-4" />
            <span className="text-sm">{user?.name || user?.email}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
