import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { lineageService } from "@/lib/services/lineage-service"

// GET /api/dbLineage/schemas/[appId] - Get schemas by application ID
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { appId } = await params

    const schemas = await lineageService.getSchemasByAppId(appId)

    return NextResponse.json({ schemas })
  } catch (error) {
    console.error("Error fetching schemas:", error)
    return NextResponse.json(
      { error: "Failed to fetch schemas" },
      { status: 417 }
    )
  }
}
