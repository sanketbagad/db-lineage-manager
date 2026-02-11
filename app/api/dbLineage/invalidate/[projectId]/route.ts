import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { cacheService } from "@/lib/cache"
import { getDb } from "@/lib/db"

// POST /api/dbLineage/invalidate/[projectId] - Invalidate cache for a project
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { projectId } = await params

    // Verify user owns this project
    const sql = getDb()
    const projects = await sql`
      SELECT id FROM projects WHERE id = ${projectId} AND user_id = ${user.id}
    `

    if (projects.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Invalidate cache
    await cacheService.invalidateProject(projectId)

    // Also clear DB_LINEAGE_RESULT for this project if requested
    await sql`
      DELETE FROM db_lineage_result WHERE project_id = ${projectId}
    `

    return NextResponse.json({ 
      success: true, 
      message: "Cache invalidated successfully" 
    })
  } catch (error) {
    console.error("Error invalidating cache:", error)
    return NextResponse.json(
      { error: "Failed to invalidate cache" },
      { status: 500 }
    )
  }
}
