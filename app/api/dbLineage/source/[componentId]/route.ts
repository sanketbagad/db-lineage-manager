import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { lineageService } from "@/lib/services/lineage-service"

// GET /api/dbLineage/source/[componentId] - Get source code for a component
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ componentId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { componentId } = await params

    const source = await lineageService.getComponentSource(componentId)

    if (!source) {
      return NextResponse.json(
        { error: "Component source not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(source)
  } catch (error) {
    console.error("Error fetching component source:", error)
    return NextResponse.json(
      { error: "Failed to fetch component source" },
      { status: 417 }
    )
  }
}
