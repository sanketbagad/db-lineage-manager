import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getDb } from "@/lib/db"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const sql = getDb()

    const projects = await sql`
      SELECT * FROM projects WHERE id = ${id} AND user_id = ${user.id}
    `
    if (projects.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const files = await sql`
      SELECT id, file_path, language, parsed FROM source_files WHERE project_id = ${id} ORDER BY file_path
    `

    const schemas = await sql`
      SELECT ds.*, json_agg(
        json_build_object(
          'id', dc.id,
          'column_name', dc.column_name,
          'data_type', dc.data_type,
          'is_primary_key', dc.is_primary_key,
          'is_foreign_key', dc.is_foreign_key,
          'foreign_table', dc.foreign_table,
          'foreign_column', dc.foreign_column,
          'ai_description', dc.ai_description
        ) ORDER BY dc.column_name
      ) FILTER (WHERE dc.id IS NOT NULL) as columns
      FROM db_schemas ds
      LEFT JOIN db_columns dc ON dc.schema_id = ds.id
      WHERE ds.project_id = ${id}
      GROUP BY ds.id
      ORDER BY ds.table_name
    `

    const jobs = await sql`
      SELECT * FROM processing_jobs WHERE project_id = ${id} ORDER BY created_at DESC
    `

    return NextResponse.json({
      project: projects[0],
      files,
      schemas,
      jobs,
    })
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { confirmName } = body

    const sql = getDb()

    // Get project to verify ownership and name
    const projects = await sql`
      SELECT id, name FROM projects WHERE id = ${id} AND user_id = ${user.id}
    `

    if (projects.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const project = projects[0]

    // Verify confirmation name matches
    if (!confirmName || confirmName !== project.name) {
      return NextResponse.json(
        { error: "Confirmation name does not match project name" },
        { status: 400 }
      )
    }

    // Delete all related data in order (respecting foreign key constraints)
    // 1. Column usages
    await sql`
      DELETE FROM column_usages 
      WHERE column_id IN (
        SELECT dc.id FROM db_columns dc 
        JOIN db_schemas ds ON ds.id = dc.schema_id 
        WHERE ds.project_id = ${id}
      )
    `

    // 2. DB columns
    await sql`
      DELETE FROM db_columns 
      WHERE schema_id IN (SELECT id FROM db_schemas WHERE project_id = ${id})
    `

    // 3. DB schemas
    await sql`DELETE FROM db_schemas WHERE project_id = ${id}`

    // 4. Source files
    await sql`DELETE FROM source_files WHERE project_id = ${id}`

    // 5. Processing jobs
    await sql`DELETE FROM processing_jobs WHERE project_id = ${id}`

    // 6. Finally, delete the project
    await sql`DELETE FROM projects WHERE id = ${id} AND user_id = ${user.id}`

    return NextResponse.json({ 
      success: true, 
      message: `Project "${project.name}" and all related data deleted successfully` 
    })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    )
  }
}
