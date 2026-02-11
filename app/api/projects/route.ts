import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getDb } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const appId = url.searchParams.get("appId")

    const sql = getDb()
    
    let projects
    if (appId) {
      projects = await sql`
        SELECT p.*,
          (SELECT COUNT(*) FROM source_files WHERE project_id = p.id) as file_count,
          (SELECT COUNT(*) FROM db_schemas WHERE project_id = p.id) as table_count
        FROM projects p
        WHERE p.user_id = ${user.id}
          AND p.application_id = ${appId}
        ORDER BY p.created_at DESC
      `
    } else {
      projects = await sql`
        SELECT p.*,
          (SELECT COUNT(*) FROM source_files WHERE project_id = p.id) as file_count,
          (SELECT COUNT(*) FROM db_schemas WHERE project_id = p.id) as table_count
        FROM projects p
        WHERE p.user_id = ${user.id}
        ORDER BY p.created_at DESC
      `
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description, applicationId } = await req.json()

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      )
    }

    const sql = getDb()
    const projects = await sql`
      INSERT INTO projects (user_id, name, description, application_id, status)
      VALUES (${user.id}, ${name}, ${description || null}, ${applicationId || null}, 'pending')
      RETURNING *
    `

    return NextResponse.json({ project: projects[0] })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}
