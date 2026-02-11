import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { lineageService } from "@/lib/services/lineage-service"
import { getDb } from "@/lib/db"

// GET /api/dbLineage/lineage/[...params]
// Params: projectIds (comma-separated), tableName, columnName (or "null"), regenerate
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

    if (!routeParams || routeParams.length < 4) {
      return NextResponse.json(
        { error: "Project ID(s), table name, column name, and regenerate flag are required" },
        { status: 400 }
      )
    }

    const projectIdsParam = decodeURIComponent(routeParams[0])
    const tableName = decodeURIComponent(routeParams[1])
    const columnNameParam = decodeURIComponent(routeParams[2])
    const regenerateParam = routeParams[3]

    const projectIds = projectIdsParam.split(",")
    const columnName = columnNameParam === "null" ? null : columnNameParam
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

    const { lineage, fromCache } = await lineageService.generateLineage(
      projectIds,
      tableName,
      columnName,
      regenerate
    )

    return NextResponse.json({
      lineage,
      fromCache,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error generating lineage:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate lineage" },
      { status: 417 }
    )
  }
}
