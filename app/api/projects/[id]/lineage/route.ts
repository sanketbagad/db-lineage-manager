import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { lineageService } from "@/lib/services/lineage-service"

export async function GET(
  req: Request,
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
      SELECT id FROM projects WHERE id = ${id} AND user_id = ${user.id}
    `
    if (projects.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Check for query params for new lineage format
    const url = new URL(req.url)
    const tableName = url.searchParams.get("table")
    const columnName = url.searchParams.get("column")
    const regenerate = url.searchParams.get("regenerate") === "true"

    // If table is specified, use new component-based lineage
    if (tableName) {
      const { lineage, fromCache } = await lineageService.generateLineage(
        [id],
        tableName,
        columnName,
        regenerate
      )
      return NextResponse.json({
        lineage,
        fromCache,
        generatedAt: new Date().toISOString(),
      })
    }

    // Original behavior - get all usages with full details
    const usages = await sql`
      SELECT
        cu.id as usage_id,
        cu.usage_type,
        cu.line_number,
        cu.code_snippet,
        cu.context,
        dc.id as column_id,
        dc.column_name,
        dc.data_type,
        dc.is_primary_key,
        dc.is_foreign_key,
        dc.foreign_table,
        dc.foreign_column,
        dc.ai_description,
        ds.table_name,
        sf.id as file_id,
        sf.file_path,
        sf.language
      FROM column_usages cu
      JOIN db_columns dc ON cu.column_id = dc.id
      JOIN db_schemas ds ON dc.schema_id = ds.id
      JOIN source_files sf ON cu.source_file_id = sf.id
      WHERE ds.project_id = ${id}
      ORDER BY ds.table_name, dc.column_name, sf.file_path
    `

    // Build a "column summary" -- for each column, list all files that use it
    interface FileSummary {
      file_id: string
      file_path: string
      language: string
      usage_types: string[]
      line_numbers: number[]
    }
    interface ColumnSummary {
      column_id: string
      column_name: string
      data_type: string
      table_name: string
      is_primary_key: boolean
      is_foreign_key: boolean
      foreign_table: string | null
      foreign_column: string | null
      ai_description: string | null
      files: FileSummary[]
      total_usages: number
    }

    const columnMap = new Map<string, ColumnSummary>()

    for (const u of usages) {
      const key = `${u.table_name}.${u.column_name}`
      if (!columnMap.has(key)) {
        columnMap.set(key, {
          column_id: u.column_id as string,
          column_name: u.column_name as string,
          data_type: u.data_type as string,
          table_name: u.table_name as string,
          is_primary_key: u.is_primary_key as boolean,
          is_foreign_key: u.is_foreign_key as boolean,
          foreign_table: u.foreign_table as string | null,
          foreign_column: u.foreign_column as string | null,
          ai_description: u.ai_description as string | null,
          files: [],
          total_usages: 0,
        })
      }

      const col = columnMap.get(key)!
      col.total_usages++

      // Group by file
      let fileSummary = col.files.find((f) => f.file_id === u.file_id)
      if (!fileSummary) {
        fileSummary = {
          file_id: u.file_id as string,
          file_path: u.file_path as string,
          language: u.language as string,
          usage_types: [],
          line_numbers: [],
        }
        col.files.push(fileSummary)
      }
      const usageType = u.usage_type as string
      if (!fileSummary.usage_types.includes(usageType)) {
        fileSummary.usage_types.push(usageType)
      }
      fileSummary.line_numbers.push(u.line_number as number)
    }

    const columnSummaries = Array.from(columnMap.values())

    return NextResponse.json({
      usages,
      columnSummaries,
    })
  } catch (error) {
    console.error("Error fetching lineage:", error)
    return NextResponse.json(
      { error: "Failed to fetch lineage" },
      { status: 500 }
    )
  }
}
