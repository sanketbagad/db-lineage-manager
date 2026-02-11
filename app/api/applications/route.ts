import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getDb } from "@/lib/db"

// GET /api/applications - List all applications
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()
    const applications = await sql`
      SELECT a.*, 
        (SELECT COUNT(*) FROM projects WHERE application_id = a.id) as project_count
      FROM applications a
      ORDER BY a.name
    `

    return NextResponse.json({ applications })
  } catch (error) {
    console.error("Error fetching applications:", error)
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    )
  }
}

// POST /api/applications - Create a new application
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description } = await req.json()

    if (!name) {
      return NextResponse.json(
        { error: "Application name is required" },
        { status: 400 }
      )
    }

    const sql = getDb()
    const applications = await sql`
      INSERT INTO applications (name, description)
      VALUES (${name}, ${description || null})
      RETURNING *
    `

    return NextResponse.json({ application: applications[0] })
  } catch (error) {
    console.error("Error creating application:", error)
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    )
  }
}
