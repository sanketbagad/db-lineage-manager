import React, { Suspense } from "react"
import { AppHeader } from "@/components/app-header"
import { Skeleton } from "@/components/ui/skeleton"

function AppHeaderSkeleton() {
  return (
    <div className="border-b bg-card h-16 flex items-center px-6">
      <Skeleton className="h-8 w-48" />
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<AppHeaderSkeleton />}>
        <AppHeader />
      </Suspense>
      <main className="flex-1">{children}</main>
    </div>
  )
}
