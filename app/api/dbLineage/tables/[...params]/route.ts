import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { lineageService } from "@/lib/services/lineage-service"
import { getDb } from "@/lib/db"

// GET /api/dbLineage/tables/[...params] - Get tables by project ID(s)
// Params: projectIds (comma-separated), regenerate (true/false)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ params: string[] }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { params: routeParams } = await params

    if (!routeParams || routeParams.length < 2) {
      return NextResponse.json(
        { error: "Project ID(s) and regenerate flag are required" },
        { status: 400 }
      )
    }

    // Parse project IDs (can be comma-separated)
    const projectIdsParam = routeParams[0]
    const regenerateParam = routeParams[1]

    const projectIds = projectIdsParam.split(",")
    const regenerate = regenerateParam === "true"

    // Verify user owns these projects
    const sql = getDb()
    const projects = await sql`
      SELECT id FROM projects 
      WHERE id = ANY(${projectIds}) AND user_id = ${user.id}
    `

    if (projects.length !== projectIds.length) {
      return NextResponse.json(
        { error: "One or more projects not found or unauthorized" },
        { status: 404 }
      )
    }

    const tables = await lineageService.getTablesByProjectIds(projectIds, regenerate)

    return NextResponse.json({ tables })
  } catch (error) {
    console.error("Error fetching tables:", error)
    return NextResponse.json(
      { error: "Failed to fetch tables" },
      { status: 417 }
    )
  }
}
