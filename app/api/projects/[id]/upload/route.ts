import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { put } from "@vercel/blob"
import JSZip from "jszip"
import { detectLanguage } from "@/lib/languages"
import {
  detectOrmsInFile,
  extractFieldColumnMappings,
  toSnakeCase,
  toCamelCase,
  toPascalCase,
  type OrmDetection,
} from "@/lib/orm-patterns"

const CODE_EXTENSIONS = [
  ".go", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
  ".java", ".py", ".rb", ".rs", ".cs", ".sql",
  ".graphql", ".gql", ".proto", ".prisma",
]

const SCHEMA_FILES = [
  "schema.sql", "migration", "migrate", "create_table",
  "schema.prisma", "schema.graphql",
]

const ORM_SCHEMA_FILES = [
  "schema.prisma", "models.py", "entities", "entity",
  "model", "schema.ts", "schema.js", "tables.ts", "tables.js",
]

function isCodeFile(path: string): boolean {
  const lower = path.toLowerCase()
  if (
    lower.includes("node_modules/") ||
    lower.includes("vendor/") ||
    lower.includes(".git/") ||
    lower.includes("__pycache__/") ||
    lower.includes(".class") ||
    lower.includes("/dist/") ||
    lower.includes("/build/") ||
    lower.includes("/target/")
  ) {
    return false
  }
  return CODE_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

function isSchemaFile(path: string): boolean {
  const lower = path.toLowerCase()
  return (
    SCHEMA_FILES.some((s) => lower.includes(s)) ||
    lower.endsWith(".sql")
  )
}

function isOrmSchemaFile(path: string): boolean {
  const lower = path.toLowerCase()
  return ORM_SCHEMA_FILES.some((s) => lower.includes(s))
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()

    const projects = await sql`
      SELECT * FROM projects WHERE id = ${projectId} AND user_id = ${user.id}
    `
    if (projects.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Store in Vercel Blob
    const blob = await put(`projects/${projectId}/${file.name}`, file, {
      access: "public",
    })

    await sql`UPDATE projects SET blob_url = ${blob.url}, status = 'processing' WHERE id = ${projectId}`

    // Create file scan job
    await sql`
      INSERT INTO processing_jobs (project_id, job_type, status, started_at)
      VALUES (${projectId}, 'file_scan', 'running', NOW())
    `

    // Process the ZIP
    const buffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)
    const entries = Object.entries(zip.files)
    let filesProcessed = 0
    const schemaContents: string[] = []
    const ormSchemaContents: { content: string; language: string; path: string }[] = []

    for (const [path, zipEntry] of entries) {
      if (zipEntry.dir) continue
      if (!isCodeFile(path)) continue

      const content = await zipEntry.async("text")
      const language = detectLanguage(path)

      await sql`
        INSERT INTO source_files (project_id, file_path, language, content, parsed)
        VALUES (${projectId}, ${path}, ${language}, ${content}, FALSE)
      `

      if (isSchemaFile(path)) {
        schemaContents.push(content)
      }

      if (isOrmSchemaFile(path)) {
        ormSchemaContents.push({ content, language, path })
      }

      filesProcessed++
    }

    // Mark file scan job as completed
    await sql`
      UPDATE processing_jobs
      SET status = 'completed', progress = ${filesProcessed}, total = ${filesProcessed}, completed_at = NOW()
      WHERE project_id = ${projectId} AND job_type = 'file_scan' AND status = 'running'
    `

    // ============ PHASE 2: Parse schemas (SQL + ORM) ============
    await sql`
      INSERT INTO processing_jobs (project_id, job_type, status, started_at)
      VALUES (${projectId}, 'schema_parse', 'running', NOW())
    `

    let tablesFound = 0

    // Parse SQL CREATE TABLE statements
    for (const schemaContent of schemaContents) {
      const tables = parseCreateStatements(schemaContent)
      for (const table of tables) {
        const schemas = await sql`
          INSERT INTO db_schemas (project_id, table_name)
          VALUES (${projectId}, ${table.name})
          ON CONFLICT DO NOTHING
          RETURNING id
        `
        if (schemas.length === 0) continue
        const schemaId = schemas[0].id as string

        for (const col of table.columns) {
          await sql`
            INSERT INTO db_columns (schema_id, column_name, data_type, is_primary_key, is_foreign_key, foreign_table, foreign_column)
            VALUES (${schemaId}, ${col.name}, ${col.type}, ${col.isPrimaryKey}, ${col.isForeignKey}, ${col.foreignTable || null}, ${col.foreignColumn || null})
          `
        }
        tablesFound++
      }
    }

    // Parse ORM model definitions (Prisma, SQLAlchemy, TypeORM, etc.)
    for (const ormFile of ormSchemaContents) {
      const ormTables = parseOrmModels(ormFile.content, ormFile.language)
      for (const table of ormTables) {
        const schemas = await sql`
          INSERT INTO db_schemas (project_id, table_name)
          VALUES (${projectId}, ${table.name})
          ON CONFLICT DO NOTHING
          RETURNING id
        `
        if (schemas.length === 0) continue
        const schemaId = schemas[0].id as string

        for (const col of table.columns) {
          await sql`
            INSERT INTO db_columns (schema_id, column_name, data_type, is_primary_key, is_foreign_key, foreign_table, foreign_column)
            VALUES (${schemaId}, ${col.name}, ${col.type || 'unknown'}, ${col.isPrimaryKey}, ${col.isForeignKey}, ${col.foreignTable || null}, ${col.foreignColumn || null})
          `
        }
        tablesFound++
      }
    }

    await sql`
      UPDATE processing_jobs
      SET status = 'completed', progress = ${tablesFound}, total = ${tablesFound}, completed_at = NOW()
      WHERE project_id = ${projectId} AND job_type = 'schema_parse' AND status = 'running'
    `

    // ============ PHASE 3: Enhanced Lineage Tracing ============
    await traceLineage(projectId, sql)

    await sql`UPDATE projects SET status = 'completed' WHERE id = ${projectId}`

    return NextResponse.json({
      success: true,
      filesProcessed,
      tablesFound,
      blobUrl: blob.url,
    })
  } catch (error) {
    console.error("Upload error:", error)
    const sql = getDb()
    await sql`UPDATE projects SET status = 'failed' WHERE id = ${projectId}`
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    )
  }
}

// ================================================================
// SQL Schema Parser
// ================================================================

interface ParsedColumn {
  name: string
  type: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  foreignTable?: string
  foreignColumn?: string
}

interface ParsedTable {
  name: string
  columns: ParsedColumn[]
}

function parseCreateStatements(sqlContent: string): ParsedTable[] {
  const tables: ParsedTable[] = []
  const createRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|")?(\w+)(?:`|")?\s*\(([\s\S]*?)\);/gi
  let match: RegExpExecArray | null

  while ((match = createRegex.exec(sqlContent)) !== null) {
    const tableName = match[1]
    const body = match[2]
    const columns: ParsedColumn[] = []

    const lines = body
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean)

    for (const line of lines) {
      const upper = line.toUpperCase()
      if (
        upper.startsWith("PRIMARY KEY") ||
        upper.startsWith("UNIQUE") ||
        upper.startsWith("INDEX") ||
        upper.startsWith("KEY") ||
        upper.startsWith("CONSTRAINT") ||
        upper.startsWith("CHECK") ||
        upper.startsWith("FOREIGN KEY")
      ) {
        continue
      }

      const colMatch = line.match(/^(?:`|")?(\w+)(?:`|")?\s+(\w[\w() ]*)/i)
      if (!colMatch) continue

      const col: ParsedColumn = {
        name: colMatch[1],
        type: colMatch[2].trim(),
        isPrimaryKey: upper.includes("PRIMARY KEY"),
        isForeignKey: upper.includes("REFERENCES"),
      }

      if (col.isForeignKey) {
        const refMatch = line.match(
          /REFERENCES\s+(?:`|")?(\w+)(?:`|")?\s*\(\s*(?:`|")?(\w+)(?:`|")?\s*\)/i
        )
        if (refMatch) {
          col.foreignTable = refMatch[1]
          col.foreignColumn = refMatch[2]
        }
      }

      columns.push(col)
    }

    if (columns.length > 0) {
      tables.push({ name: tableName, columns })
    }
  }

  return tables
}

// ================================================================
// ORM Model Parser
// ================================================================

function parseOrmModels(content: string, language: string): ParsedTable[] {
  const tables: ParsedTable[] = []

  // ---------- Prisma ----------
  if (language === "unknown" || content.includes("model ")) {
    const prismaModelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\}/g
    let m: RegExpExecArray | null
    while ((m = prismaModelRegex.exec(content)) !== null) {
      const modelName = m[1]
      const body = m[2]
      const columns: ParsedColumn[] = []

      // Check @@map for custom table name
      const mapMatch = body.match(/@@map\(\s*["'](\w+)["']\s*\)/)
      const tableName = mapMatch ? mapMatch[1] : toSnakeCase(modelName) + "s"

      const lines = body.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//") && !l.startsWith("@@"))

      for (const line of lines) {
        const fieldMatch = line.match(/^(\w+)\s+(\w+)(\?|\[\])?\s*(.*)/)
        if (!fieldMatch) continue

        const fieldName = fieldMatch[1]
        const fieldType = fieldMatch[2]
        const rest = fieldMatch[4] || ""

        // Skip relation fields (those with @relation)
        if (rest.includes("@relation")) continue
        // Skip fields whose type is another model (capitalized and not a Prisma scalar)
        const prismaScalars = ["String", "Int", "Float", "Boolean", "DateTime", "BigInt", "Decimal", "Bytes", "Json"]
        if (!prismaScalars.includes(fieldType) && fieldType[0] === fieldType[0].toUpperCase()) continue

        const mapFieldMatch = rest.match(/@map\(\s*["'](\w+)["']\s*\)/)
        const colName = mapFieldMatch ? mapFieldMatch[1] : toSnakeCase(fieldName)

        columns.push({
          name: colName,
          type: fieldType,
          isPrimaryKey: rest.includes("@id"),
          isForeignKey: rest.includes("@relation") || fieldName.endsWith("Id"),
        })
      }

      if (columns.length > 0) {
        tables.push({ name: tableName, columns })
      }
    }
  }

  // ---------- SQLAlchemy (Python) ----------
  if (language === "python") {
    const classRegex = /class\s+(\w+)\s*\([^)]*\)\s*:([\s\S]*?)(?=\nclass\s|\n\S|\Z)/g
    let m: RegExpExecArray | null
    while ((m = classRegex.exec(content)) !== null) {
      const className = m[1]
      const body = m[2]

      const tableMatch = body.match(/__tablename__\s*=\s*['"](\w+)['"]/)
      if (!tableMatch) continue

      const tableName = tableMatch[1]
      const columns: ParsedColumn[] = []

      const colRegex = /(\w+)\s*=\s*(?:Column|mapped_column)\s*\(([\s\S]*?)\)/g
      let cm: RegExpExecArray | null
      while ((cm = colRegex.exec(body)) !== null) {
        const name = cm[1]
        const args = cm[2]
        const typeMatch = args.match(/(Integer|String|Text|Float|Boolean|DateTime|BigInteger|Numeric|Date|Time|LargeBinary|JSON|UUID)/i)
        columns.push({
          name,
          type: typeMatch ? typeMatch[1] : "unknown",
          isPrimaryKey: args.includes("primary_key=True") || args.includes("primary_key = True"),
          isForeignKey: args.includes("ForeignKey"),
          foreignTable: (() => {
            const fkMatch = args.match(/ForeignKey\s*\(\s*['"](\w+)\.(\w+)['"]/)
            return fkMatch ? fkMatch[1] : undefined
          })(),
          foreignColumn: (() => {
            const fkMatch = args.match(/ForeignKey\s*\(\s*['"](\w+)\.(\w+)['"]/)
            return fkMatch ? fkMatch[2] : undefined
          })(),
        })
      }

      if (columns.length > 0) {
        tables.push({ name: tableName, columns })
      }
    }
  }

  // ---------- Go struct with GORM tags ----------
  if (language === "go") {
    const structRegex = /type\s+(\w+)\s+struct\s*\{([\s\S]*?)\}/g
    let m: RegExpExecArray | null
    while ((m = structRegex.exec(content)) !== null) {
      const structName = m[1]
      const body = m[2]

      if (!body.includes("gorm:") && !body.includes("db:") && !body.includes("json:")) continue

      // Determine table name
      const tableNameMethodRegex = new RegExp(
        `func\\s*\\(\\s*\\w+\\s+${structName}\\s*\\)\\s*TableName\\s*\\(\\s*\\)\\s*string\\s*\\{[^}]*return\\s+["'](\\w+)["']`,
        "m"
      )
      const tableNameMatch = content.match(tableNameMethodRegex)
      const tableName = tableNameMatch ? tableNameMatch[1] : toSnakeCase(structName) + "s"

      const columns: ParsedColumn[] = []
      const fieldRegex = /(\w+)\s+(\S+)\s+`([^`]*)`/g
      let fm: RegExpExecArray | null
      while ((fm = fieldRegex.exec(body)) !== null) {
        const fieldName = fm[1]
        const fieldType = fm[2]
        const tags = fm[3]

        // Skip embedded structs like gorm.Model
        if (fieldType.includes(".") && !tags.includes("column:")) continue

        const gormColMatch = tags.match(/gorm:"[^"]*column:(\w+)/)
        const jsonMatch = tags.match(/json:"(\w+)/)
        const colName = gormColMatch ? gormColMatch[1] : jsonMatch ? jsonMatch[1] : toSnakeCase(fieldName)

        if (colName === "-") continue

        columns.push({
          name: colName,
          type: fieldType,
          isPrimaryKey: tags.includes("primaryKey") || tags.includes("primarykey") || fieldName === "ID",
          isForeignKey: fieldName.endsWith("ID") && fieldName !== "ID",
        })
      }

      if (columns.length > 0) {
        tables.push({ name: tableName, columns })
      }
    }
  }

  // ---------- Java JPA Entities ----------
  if (language === "java") {
    const entityRegex = /@(?:Entity|Table)[^]*?class\s+(\w+)\s*(?:extends\s+\w+\s*)?(?:implements\s+[\w,\s]+\s*)?\{([\s\S]*?)\n\}/g
    let m: RegExpExecArray | null
    while ((m = entityRegex.exec(content)) !== null) {
      const className = m[1]
      const body = m[2]

      const tableAnnotation = content.match(/@Table\s*\(\s*name\s*=\s*["'](\w+)["']/)
      const tableName = tableAnnotation ? tableAnnotation[1] : toSnakeCase(className) + "s"

      const columns: ParsedColumn[] = []
      const fieldRegex = /(?:@Column\s*(?:\(\s*(?:name\s*=\s*["'](\w+)["'][^)]*)\s*\))?\s*)?(?:@Id\s+)?private\s+(\w+)\s+(\w+)\s*;/g
      let fm: RegExpExecArray | null
      while ((fm = fieldRegex.exec(body)) !== null) {
        const explicitName = fm[1]
        const fieldType = fm[2]
        const fieldName = fm[3]
        const colName = explicitName || toSnakeCase(fieldName)

        const surroundingContext = body.substring(Math.max(0, fm.index - 200), fm.index)
        const isPK = surroundingContext.includes("@Id")
        const isFK = surroundingContext.includes("@ManyToOne") || surroundingContext.includes("@JoinColumn")

        columns.push({
          name: colName,
          type: fieldType,
          isPrimaryKey: isPK,
          isForeignKey: isFK,
        })
      }

      if (columns.length > 0) {
        tables.push({ name: tableName, columns })
      }
    }
  }

  return tables
}

// ================================================================
// Enhanced Lineage Tracing
// ================================================================

type SqlFn = ReturnType<typeof import("@neondatabase/serverless").neon>

async function traceLineage(projectId: string, sql: SqlFn) {
  await sql`
    INSERT INTO processing_jobs (project_id, job_type, status, started_at)
    VALUES (${projectId}, 'lineage_trace', 'running', NOW())
  `

  try {
    // Get all columns for this project
    const columns = await sql`
      SELECT dc.id, dc.column_name, ds.table_name
      FROM db_columns dc
      JOIN db_schemas ds ON dc.schema_id = ds.id
      WHERE ds.project_id = ${projectId}
    `

    // Get all source files
    const files = await sql`
      SELECT id, file_path, language, content
      FROM source_files
      WHERE project_id = ${projectId} AND content IS NOT NULL
    `

    let usagesFound = 0

    // Build lookup structures for column names and their variants
    const columnVariants = new Map<
      string,
      { colId: string; colName: string; tableName: string }[]
    >()

    for (const col of columns) {
      const colName = (col.column_name as string).toLowerCase()
      const tableName = (col.table_name as string).toLowerCase()

      // Generate all naming convention variants of this column
      const variants = new Set<string>()
      variants.add(colName) // original: user_id
      variants.add(toCamelCase(colName)) // userId
      variants.add(toPascalCase(colName)) // UserId
      variants.add(colName.replace(/_/g, "")) // userid
      // Also add with dot notation: table.column
      variants.add(`${tableName}.${colName}`)
      variants.add(`${toCamelCase(tableName)}.${toCamelCase(colName)}`)

      for (const variant of variants) {
        if (variant.length < 2) continue // Skip too-short names
        if (!columnVariants.has(variant)) columnVariants.set(variant, [])
        columnVariants.get(variant)!.push({
          colId: col.id as string,
          colName: col.column_name as string,
          tableName: col.table_name as string,
        })
      }
    }

    // Table name variants for context checking
    const tableNames = new Set<string>()
    for (const col of columns) {
      const tn = (col.table_name as string).toLowerCase()
      tableNames.add(tn)
      tableNames.add(toCamelCase(tn))
      tableNames.add(toPascalCase(tn))
      // Singular form (crude)
      if (tn.endsWith("s")) {
        const singular = tn.slice(0, -1)
        tableNames.add(singular)
        tableNames.add(toCamelCase(singular))
        tableNames.add(toPascalCase(singular))
      }
    }

    // Track already-inserted usages to avoid dupes
    const insertedUsages = new Set<string>()

    for (const file of files) {
      const content = file.content as string
      if (!content) continue

      const language = file.language as string
      const filePath = file.file_path as string
      const fileId = file.id as string
      const lines = content.split("\n")

      // Detect ORMs used in this file
      const detectedOrms = detectOrmsInFile(content, language)

      // Extract field-to-column mappings from this file's ORM patterns
      const fieldColumnMap = extractFieldColumnMappings(content, detectedOrms)

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (!line.trim()) continue

        // Skip comments
        const trimmedLine = line.trim()
        if (
          trimmedLine.startsWith("//") ||
          trimmedLine.startsWith("#") ||
          trimmedLine.startsWith("*") ||
          trimmedLine.startsWith("/*") ||
          trimmedLine.startsWith("--")
        ) {
          continue
        }

        // ---- Strategy 1: Direct column name match ----
        for (const [variant, colInfos] of columnVariants) {
          // Skip short generic names unless table is also referenced
          if (variant.length <= 3) continue

          // Check if the variant appears in this line
          const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          const wordBoundary = new RegExp(
            `(?:['"\`\\[\\.]|\\b)${escaped}(?:['"\`\\s,)\\]:]|\\b)`,
            "i"
          )
          if (!wordBoundary.test(line)) continue

          // Determine context window (5 lines before and after)
          const ctxStart = Math.max(0, i - 5)
          const ctxEnd = Math.min(lines.length, i + 6)
          const contextLines = lines.slice(ctxStart, ctxEnd)
          const context = contextLines.join("\n")
          const contextLower = context.toLowerCase()

          for (const colInfo of colInfos) {
            // Check table reference in context
            const tableVariants = [
              colInfo.tableName.toLowerCase(),
              toCamelCase(colInfo.tableName),
              toPascalCase(colInfo.tableName),
            ]
            if (colInfo.tableName.endsWith("s")) {
              const singular = colInfo.tableName.slice(0, -1)
              tableVariants.push(singular, toCamelCase(singular), toPascalCase(singular))
            }

            const hasTableRef = tableVariants.some((tv) =>
              contextLower.includes(tv.toLowerCase())
            )

            // Accept if: table is referenced OR column name is specific enough (>4 chars)
            // OR an ORM pattern is detected in this file
            if (!hasTableRef && colInfo.colName.length <= 4 && detectedOrms.length === 0) {
              continue
            }

            // Determine usage type
            const usageType = determineUsageType(line, context, detectedOrms)

            const usageKey = `${colInfo.colId}-${fileId}-${i + 1}-${usageType}`
            if (insertedUsages.has(usageKey)) continue
            insertedUsages.add(usageKey)

            const snippet = lines
              .slice(Math.max(0, i - 2), Math.min(lines.length, i + 3))
              .join("\n")

            await sql`
              INSERT INTO column_usages (column_id, source_file_id, line_number, usage_type, code_snippet, context)
              VALUES (${colInfo.colId}, ${fileId}, ${i + 1}, ${usageType}, ${snippet.slice(0, 500)}, ${context.slice(0, 1000)})
            `
            usagesFound++
          }
        }

        // ---- Strategy 2: ORM field-to-column mapping match ----
        // If this file has ORM patterns, check if any ORM field names map to our columns
        if (fieldColumnMap.size > 0) {
          for (const [fieldName, columnName] of fieldColumnMap) {
            // Check if this field is referenced in the current line
            const fieldEscaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            const fieldRegex = new RegExp(`\\b${fieldEscaped}\\b`, "i")
            if (!fieldRegex.test(line)) continue

            // Find which db_column this maps to
            const matchingCols = columns.filter(
              (c) => (c.column_name as string).toLowerCase() === columnName
            )

            for (const col of matchingCols) {
              const usageType = determineUsageType(line, lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 6)).join("\n"), detectedOrms)

              const usageKey = `${col.id}-${fileId}-${i + 1}-${usageType}-orm`
              if (insertedUsages.has(usageKey)) continue
              insertedUsages.add(usageKey)

              const snippet = lines
                .slice(Math.max(0, i - 2), Math.min(lines.length, i + 3))
                .join("\n")
              const context = lines
                .slice(Math.max(0, i - 5), Math.min(lines.length, i + 6))
                .join("\n")

              await sql`
                INSERT INTO column_usages (column_id, source_file_id, line_number, usage_type, code_snippet, context)
                VALUES (${col.id}, ${fileId}, ${i + 1}, ${usageType}, ${snippet.slice(0, 500)}, ${context.slice(0, 1000)})
              `
              usagesFound++
            }
          }
        }
      }

      // Mark file as parsed
      await sql`UPDATE source_files SET parsed = TRUE WHERE id = ${fileId}`
    }

    await sql`
      UPDATE processing_jobs
      SET status = 'completed', progress = ${usagesFound}, total = ${usagesFound}, completed_at = NOW()
      WHERE project_id = ${projectId} AND job_type = 'lineage_trace' AND status = 'running'
    `
  } catch (error) {
    console.error("Lineage tracing error:", error)
    await sql`
      UPDATE processing_jobs
      SET status = 'failed', error_message = ${String(error)}, completed_at = NOW()
      WHERE project_id = ${projectId} AND job_type = 'lineage_trace' AND status = 'running'
    `
  }
}

/**
 * Determine the usage type of a column reference in a line,
 * with ORM-aware detection.
 */
function determineUsageType(
  line: string,
  context: string,
  detectedOrms: OrmDetection[]
): string {
  // First try ORM-specific patterns
  for (const orm of detectedOrms) {
    for (const pattern of orm.usagePatterns) {
      if (pattern.regex.test(line) || pattern.regex.test(context)) {
        if (pattern.usageType !== "definition") {
          return pattern.usageType
        }
      }
    }
  }

  // Fall back to generic SQL/code pattern detection
  const upper = line.toUpperCase()
  const contextUpper = context.toUpperCase()

  // Check current line first
  if (/\b(INSERT\s+INTO|\.create|\.Create|\.add|\.Add|\.persist|\.save)\b/i.test(line)) return "write"
  if (/\b(UPDATE\s+\w+\s+SET|\.update|\.Update|\.merge|\.Merge|\.set\s*\()/i.test(line)) return "update"
  if (/\b(DELETE\s+FROM|\.delete|\.Delete|\.remove|\.Remove|\.destroy|\.Destroy)/i.test(line)) return "delete"
  if (/\b(JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|CROSS\s+JOIN|\.join|\.Join|\.include|\.Include|\.Preload)/i.test(line)) return "join"
  if (/\b(WHERE|AND\s+\w+\s*=|OR\s+\w+\s*=|HAVING|\.filter|\.Filter|\.where|\.Where|\.findBy)/i.test(line)) return "filter"
  if (/\b(SELECT\s+\w|\.select\s*\(|\.Select\s*\(|\.pluck\s*\(|RETURNING|\.findMany|\.findFirst|\.findOne|\.findAll)/i.test(line)) return "projection"

  // Check context window
  if (/\b(INSERT|CREATE)\b/.test(contextUpper)) return "write"
  if (/\bUPDATE\b/.test(contextUpper) && /\bSET\b/.test(contextUpper)) return "update"
  if (/\bDELETE\b/.test(contextUpper)) return "delete"
  if (/\bJOIN\b/.test(contextUpper)) return "join"
  if (/\bWHERE\b/.test(contextUpper)) return "filter"
  if (/\bSELECT\b/.test(contextUpper)) return "projection"

  return "read"
}
