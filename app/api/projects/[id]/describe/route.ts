import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { generateText, Output } from "ai"
import { z } from "zod"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await params
    const sql = getDb()

    // Verify ownership
    const projects = await sql`
      SELECT id FROM projects WHERE id = ${projectId} AND user_id = ${user.id}
    `
    if (projects.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Create AI describe job
    await sql`
      INSERT INTO processing_jobs (project_id, job_type, status)
      VALUES (${projectId}, 'ai_describe', 'running')
    `

    // Fetch all columns with their schemas and usage info
    const columns = await sql`
      SELECT
        dc.id,
        dc.column_name,
        dc.data_type,
        dc.is_primary_key,
        dc.is_foreign_key,
        dc.foreign_table,
        dc.foreign_column,
        ds.table_name
      FROM db_columns dc
      JOIN db_schemas ds ON dc.schema_id = ds.id
      WHERE ds.project_id = ${projectId}
    `

    // Fetch all usages for context
    const usages = await sql`
      SELECT
        cu.column_id,
        cu.usage_type,
        cu.code_snippet,
        sf.file_path,
        sf.language
      FROM column_usages cu
      JOIN db_columns dc ON cu.column_id = dc.id
      JOIN db_schemas ds ON dc.schema_id = ds.id
      JOIN source_files sf ON cu.source_file_id = sf.id
      WHERE ds.project_id = ${projectId}
    `

    // Group usages by column
    const usageMap = new Map<string, Array<{ usage_type: string; code_snippet: string; file_path: string; language: string }>>()
    for (const u of usages) {
      const key = u.column_id as string
      if (!usageMap.has(key)) usageMap.set(key, [])
      usageMap.get(key)!.push({
        usage_type: u.usage_type as string,
        code_snippet: u.code_snippet as string,
        file_path: u.file_path as string,
        language: u.language as string,
      })
    }

    let described = 0

    // Process columns in batches of 5
    const batchSize = 5
    for (let i = 0; i < columns.length; i += batchSize) {
      const batch = columns.slice(i, i + batchSize)

      const columnsContext = batch.map((col) => {
        const colUsages = usageMap.get(col.id as string) || []

        // Group by file for file-level summary
        const fileMap = new Map<string, { language: string; types: Set<string>; snippets: string[] }>()
        for (const u of colUsages) {
          if (!fileMap.has(u.file_path)) {
            fileMap.set(u.file_path, { language: u.language, types: new Set(), snippets: [] })
          }
          const entry = fileMap.get(u.file_path)!
          entry.types.add(u.usage_type)
          if (entry.snippets.length < 2) {
            entry.snippets.push(u.code_snippet?.slice(0, 150) || "")
          }
        }

        const filesSummary = Array.from(fileMap.entries())
          .slice(0, 5)
          .map(([fp, info]) =>
            `  - ${fp} (${info.language}) [${Array.from(info.types).join(", ")}]\n    ${info.snippets.join("\n    ")}`
          )
          .join("\n")

        return `Table: ${col.table_name}, Column: ${col.column_name}, Type: ${col.data_type}${col.is_primary_key ? ", PRIMARY KEY" : ""}${col.is_foreign_key ? `, FK -> ${col.foreign_table}.${col.foreign_column}` : ""}
Used in ${fileMap.size} file(s), ${colUsages.length} total usage(s):
${filesSummary || "No usage examples found"}`
      })

      const prompt = `You are a database documentation expert. For each database column below, generate a clear, concise description (1-2 sentences) of what the column stores and how it is used across the codebase. Consider the column name, data type, relationships, the specific files it appears in, the ORM patterns used (Prisma, GORM, Sequelize, TypeORM, Hibernate, SQLAlchemy, ActiveRecord, Drizzle, Knex, Diesel, Entity Framework etc.), and the usage types (read, write, update, delete, join, filter, projection).

${columnsContext.join("\n\n---\n\n")}

Return descriptions for each column.`

      try {
        const { output } = await generateText({
          model: "google/gemini-2.5-flash-preview-05-20",
          prompt,
          output: Output.object({
            schema: z.object({
              descriptions: z.array(
                z.object({
                  column_name: z.string(),
                  table_name: z.string(),
                  description: z.string(),
                })
              ),
            }),
          }),
        })

        if (output?.descriptions) {
          for (const desc of output.descriptions) {
            const matchingCol = batch.find(
              (c) =>
                c.column_name === desc.column_name &&
                c.table_name === desc.table_name
            )
            if (matchingCol) {
              await sql`
                UPDATE db_columns
                SET ai_description = ${desc.description}
                WHERE id = ${matchingCol.id}
              `
              described++
            }
          }
        }
      } catch (aiError) {
        console.error("AI generation error for batch:", aiError)
        // Continue with next batch
      }
    }

    // Mark job as completed
    await sql`
      UPDATE processing_jobs
      SET status = 'completed', progress = ${described}, total = ${columns.length}, completed_at = NOW()
      WHERE project_id = ${projectId} AND job_type = 'ai_describe' AND status = 'running'
    `

    return NextResponse.json({ success: true, described, total: columns.length })
  } catch (error) {
    console.error("Describe error:", error)
    const { id: projectId } = await params
    const sql = getDb()
    await sql`
      UPDATE processing_jobs
      SET status = 'failed', error_message = ${String(error)}, completed_at = NOW()
      WHERE project_id = ${projectId} AND job_type = 'ai_describe' AND status = 'running'
    `
    return NextResponse.json(
      { error: "Failed to generate descriptions" },
      { status: 500 }
    )
  }
}
