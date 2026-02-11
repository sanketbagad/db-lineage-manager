import { getDb } from "@/lib/db"
import { cacheService, CacheService, CACHE_KEYS } from "@/lib/cache"
import {
  DbLineageVO,
  DbLineageResult,
  DbLineageReport,
  ComponentMaster,
  TypeInformation,
  NodeType,
  ComponentType,
  DEFAULT_NODE_COLORS,
  LineageConfig,
  DbLineageTableFlowMaster,
} from "@/lib/types/lineage"

// Maximum display name length
const MAX_DISPLAY_NAME_LENGTH = 40

export class LineageService {
  private sql = getDb()
  private visitedComponents = new Set<string>()
  private config: LineageConfig | null = null

  /**
   * Get system configuration
   */
  async getConfig(): Promise<LineageConfig> {
    if (this.config) return this.config

    const cached = await cacheService.get<LineageConfig>(`${CACHE_KEYS.CONFIG}lineage`)
    if (cached) {
      this.config = cached
      return cached
    }

    const configs = await this.sql`
      SELECT config_key, config_value FROM system_control WHERE is_active = true
    `

    const configMap = new Map(configs.map((c) => [c.config_key, c.config_value]))

    this.config = {
      etlEnabled: configMap.get("ETL_DB_LINEAGE_FLAG") === "true",
      columnColors: configMap.get("COLUMN_COLORS")
        ? JSON.parse(configMap.get("COLUMN_COLORS") as string)
        : DEFAULT_NODE_COLORS,
      cacheTtl: parseInt(configMap.get("LINEAGE_CACHE_TTL") || "3600"),
      maxHierarchyDepth: parseInt(configMap.get("MAX_HIERARCHY_DEPTH") || "10"),
    }

    await cacheService.set(`${CACHE_KEYS.CONFIG}lineage`, this.config, 300) // 5 min cache
    return this.config
  }

  /**
   * Get schemas (projects with SQL/DB2 files) by application ID
   */
  async getSchemasByAppId(appId: string) {
    const cacheKey = CacheService.schemasByAppKey(appId)
    const cached = await cacheService.get(cacheKey)
    if (cached) return cached

    const projects = await this.sql`
      SELECT DISTINCT p.id, p.name, p.description
      FROM projects p
      JOIN source_files sf ON sf.project_id = p.id
      WHERE p.application_id = ${appId}
        AND sf.language IN ('sql', 'db2', 'plsql', 'tsql')
      ORDER BY p.name
    `

    await cacheService.set(cacheKey, projects, (await this.getConfig()).cacheTtl)
    return projects
  }

  /**
   * Get tables and columns for project(s)
   */
  async getTablesByProjectIds(projectIds: string[], regenerate: boolean = false) {
    const cacheKey = CacheService.tablesKey(projectIds)

    if (!regenerate) {
      const cached = await cacheService.get<Record<string, unknown[]>>(cacheKey)
      if (cached) return cached
    }

    // Try component_master first (new schema)
    let tables = await this.sql`
      SELECT 
        cm_table.id as table_id,
        cm_table.component_name as table_name,
        cm_col.id as column_id,
        cm_col.component_name as column_name,
        cm_col.component_desc as data_type
      FROM component_master cm_table
      LEFT JOIN component_master cm_col 
        ON cm_col.parent_component_id = cm_table.id 
        AND cm_col.component_type = 'COLUMN'
      WHERE cm_table.project_id = ANY(${projectIds})
        AND cm_table.component_type = 'TABLE'
        AND (cm_table.is_noise = false OR cm_table.is_noise IS NULL)
      ORDER BY cm_table.component_name, cm_col.component_name
    `

    // Fallback to old schema if no component_master data
    if (tables.length === 0) {
      tables = await this.sql`
        SELECT 
          ds.id as table_id,
          ds.table_name,
          dc.id as column_id,
          dc.column_name,
          dc.data_type
        FROM db_schemas ds
        LEFT JOIN db_columns dc ON dc.schema_id = ds.id
        WHERE ds.project_id = ANY(${projectIds})
        ORDER BY ds.table_name, dc.column_name
      `
    }

    // Group by table
    const tableMap: Record<string, unknown[]> = {}
    for (const row of tables) {
      const tableName = row.table_name as string
      if (!tableMap[tableName]) {
        tableMap[tableName] = []
      }
      if (row.column_id) {
        tableMap[tableName].push({
          columnId: row.column_id,
          columnName: row.column_name,
          dataType: row.data_type,
        })
      }
    }

    // Sort columns within each table
    for (const tableName of Object.keys(tableMap)) {
      tableMap[tableName].sort((a: unknown, b: unknown) =>
        ((a as { columnName: string }).columnName || "").localeCompare(
          (b as { columnName: string }).columnName || ""
        )
      )
    }

    const config = await this.getConfig()
    await cacheService.set(cacheKey, tableMap, config.cacheTtl)
    return tableMap
  }

  /**
   * Generate lineage for a table or column
   */
  async generateLineage(
    projectIds: string[],
    tableName: string,
    columnName: string | null,
    regenerate: boolean = false
  ): Promise<{ lineage: DbLineageVO; fromCache: boolean }> {
    const cacheKey = CacheService.lineageKey(projectIds, tableName, columnName || undefined)
    const config = await this.getConfig()

    // Check cache unless regenerate is requested
    if (!regenerate) {
      const cached = await cacheService.get<DbLineageVO>(cacheKey)
      if (cached) {
        return { lineage: cached, fromCache: true }
      }

      // Check DB_LINEAGE_RESULT
      const existing = await this.sql`
        SELECT lineage_data FROM db_lineage_result
        WHERE project_id = ANY(${projectIds})
          AND table_name = ${tableName}
          AND (column_name = ${columnName} OR (${columnName} IS NULL AND column_name IS NULL))
        ORDER BY updated_at DESC
        LIMIT 1
      `

      if (existing.length > 0 && existing[0].lineage_data) {
        await cacheService.set(cacheKey, existing[0].lineage_data, config.cacheTtl)
        return { lineage: existing[0].lineage_data as DbLineageVO, fromCache: true }
      }
    }

    // Record lineage generation start
    const reportId = await this.createLineageReport(projectIds[0], tableName, columnName)

    try {
      // Reset visited set
      this.visitedComponents.clear()

      // Build lineage tree
      const lineage = await this.buildLineageTree(projectIds, tableName, columnName, config)

      // Extend with ETL if enabled
      let finalLineage = lineage
      if (config.etlEnabled) {
        finalLineage = await this.extendWithEtlFlow(projectIds, tableName, lineage)
      }

      // Save to DB_LINEAGE_RESULT
      await this.saveLineageResult(projectIds, tableName, columnName, finalLineage)

      // Update report as completed
      await this.completeLineageReport(reportId, finalLineage)

      // Cache the result
      await cacheService.set(cacheKey, finalLineage, config.cacheTtl)

      return { lineage: finalLineage, fromCache: false }
    } catch (error) {
      // Record failure
      await this.failLineageReport(reportId, error instanceof Error ? error.stack : String(error))
      throw error
    }
  }

  /**
   * Build the lineage tree recursively
   */
  private async buildLineageTree(
    projectIds: string[],
    tableName: string,
    columnName: string | null,
    config: LineageConfig,
    depth: number = 0
  ): Promise<DbLineageVO> {
    // Create root node (table)
    const rootNode = this.createLineageNode(tableName, "TABLE", config)

    if (depth >= config.maxHierarchyDepth) {
      return rootNode
    }

    // Find components that reference this table
    let components: ComponentMaster[]

    if (columnName) {
      // Column-specific lineage
      components = await this.findComponentsByColumn(projectIds, tableName, columnName)
    } else {
      // Full table lineage
      components = await this.findComponentsByTable(projectIds, tableName)
    }

    // Build children recursively
    for (const comp of components) {
      // Cycle detection
      if (this.visitedComponents.has(comp.id)) {
        rootNode.children.push(this.createCycleNode(comp, config))
        continue
      }

      this.visitedComponents.add(comp.id)

      const childNode = await this.buildComponentNode(comp, projectIds, config, depth + 1)
      rootNode.children.push(childNode)
    }

    // Add type information (columns) if this is table-level lineage
    if (!columnName) {
      rootNode.typeInformations = await this.getTableColumns(projectIds, tableName)
    }

    return rootNode
  }

  /**
   * Find components that reference a table
   */
  private async findComponentsByTable(
    projectIds: string[],
    tableName: string
  ): Promise<ComponentMaster[]> {
    // First try component_master
    let components = await this.sql`
      SELECT DISTINCT cm.*
      FROM component_master cm
      JOIN component_trace ct ON ct.fk_child_component_id = cm.id
      JOIN component_master parent ON parent.id = ct.fk_parent_component_id
      WHERE cm.project_id = ANY(${projectIds})
        AND parent.component_name = ${tableName}
        AND parent.component_type = 'TABLE'
        AND cm.component_type NOT IN ('CREATE_COLUMN_DEFINITION', 'CREATE_TABLE_STATEMENT')
        AND (cm.is_noise = false OR cm.is_noise IS NULL)
      ORDER BY cm.order_seq NULLS LAST
    ` as unknown as ComponentMaster[]

    // Fallback to column_usages
    if (components.length === 0) {
      const usages = await this.sql`
        SELECT DISTINCT
          sf.id,
          sf.file_path as component_name,
          'FILE' as component_type,
          sf.language,
          cu.usage_type,
          cu.line_number
        FROM column_usages cu
        JOIN db_columns dc ON cu.column_id = dc.id
        JOIN db_schemas ds ON dc.schema_id = ds.id
        JOIN source_files sf ON cu.source_file_id = sf.id
        WHERE ds.project_id = ANY(${projectIds})
          AND ds.table_name = ${tableName}
        ORDER BY sf.file_path
      `

      components = usages.map((u) => ({
        id: u.id as string,
        project_id: projectIds[0],
        component_name: u.component_name as string,
        component_type: u.component_type as ComponentType,
        is_noise: false,
        created_at: new Date(),
      }))
    }

    return components
  }

  /**
   * Find components that reference a specific column
   */
  private async findComponentsByColumn(
    projectIds: string[],
    tableName: string,
    columnName: string
  ): Promise<ComponentMaster[]> {
    // First try component_master
    let components = await this.sql`
      SELECT DISTINCT cm.*
      FROM component_master cm
      JOIN component_trace ct ON ct.fk_child_component_id = cm.id
      JOIN component_master col ON col.id = ct.fk_parent_component_id
      JOIN component_master tbl ON tbl.id = col.parent_component_id
      WHERE cm.project_id = ANY(${projectIds})
        AND tbl.component_name = ${tableName}
        AND tbl.component_type = 'TABLE'
        AND col.component_name = ${columnName}
        AND col.component_type = 'COLUMN'
        AND cm.component_type NOT IN ('CREATE_COLUMN_DEFINITION', 'CREATE_TABLE_STATEMENT')
        AND (cm.is_noise = false OR cm.is_noise IS NULL)
      ORDER BY cm.order_seq NULLS LAST
    ` as unknown as ComponentMaster[]

    // Fallback to column_usages
    if (components.length === 0) {
      const usages = await this.sql`
        SELECT DISTINCT
          sf.id,
          sf.file_path as component_name,
          'FILE' as component_type,
          sf.language,
          cu.usage_type
        FROM column_usages cu
        JOIN db_columns dc ON cu.column_id = dc.id
        JOIN db_schemas ds ON dc.schema_id = ds.id
        JOIN source_files sf ON cu.source_file_id = sf.id
        WHERE ds.project_id = ANY(${projectIds})
          AND ds.table_name = ${tableName}
          AND dc.column_name = ${columnName}
        ORDER BY sf.file_path
      `

      components = usages.map((u) => ({
        id: u.id as string,
        project_id: projectIds[0],
        component_name: u.component_name as string,
        component_type: u.component_type as ComponentType,
        is_noise: false,
        created_at: new Date(),
      }))
    }

    return components
  }

  /**
   * Build a component node with its children
   */
  private async buildComponentNode(
    component: ComponentMaster,
    projectIds: string[],
    config: LineageConfig,
    depth: number
  ): Promise<DbLineageVO> {
    const nodeType = this.mapComponentToNodeType(component.component_type)
    const node = this.createLineageNode(
      component.component_name,
      nodeType,
      config,
      component
    )

    if (depth >= config.maxHierarchyDepth) {
      return node
    }

    // Get child components via function call hierarchy
    const children = await this.sql`
      SELECT cm.*
      FROM component_master cm
      JOIN function_call_hierarchy fch ON fch.child_id = cm.id
      WHERE fch.parent_id = ${component.id}
        AND (cm.is_noise = false OR cm.is_noise IS NULL)
      ORDER BY fch.call_order NULLS LAST, cm.order_seq NULLS LAST
    `

    for (const child of children) {
      if (this.visitedComponents.has(child.id as string)) {
        node.children.push(this.createCycleNode(child as ComponentMaster, config))
        continue
      }

      this.visitedComponents.add(child.id as string)
      const childNode = await this.buildComponentNode(
        child as ComponentMaster,
        projectIds,
        config,
        depth + 1
      )
      node.children.push(childNode)
    }

    // Also get direct trace children
    const traceChildren = await this.sql`
      SELECT cm.*
      FROM component_master cm
      JOIN component_trace ct ON ct.fk_child_component_id = cm.id
      WHERE ct.fk_parent_component_id = ${component.id}
        AND cm.id NOT IN (
          SELECT fch.child_id FROM function_call_hierarchy fch WHERE fch.parent_id = ${component.id}
        )
        AND (cm.is_noise = false OR cm.is_noise IS NULL)
      ORDER BY cm.order_seq NULLS LAST
    `

    for (const child of traceChildren) {
      if (this.visitedComponents.has(child.id as string)) {
        continue // Skip already processed
      }

      this.visitedComponents.add(child.id as string)
      const childNode = await this.buildComponentNode(
        child as ComponentMaster,
        projectIds,
        config,
        depth + 1
      )
      node.children.push(childNode)
    }

    return node
  }

  /**
   * Create a lineage node
   */
  private createLineageNode(
    name: string,
    type: NodeType,
    config: LineageConfig,
    component?: ComponentMaster
  ): DbLineageVO {
    const displayName =
      name.length > MAX_DISPLAY_NAME_LENGTH
        ? name.substring(0, MAX_DISPLAY_NAME_LENGTH) + "..."
        : name

    return {
      dataLineageId: undefined,
      component_Id: component?.id,
      name,
      displayName,
      type,
      color: config.columnColors[type] || DEFAULT_NODE_COLORS[type],
      sourceCode: undefined,
      children: [],
      typeInformations: [],
      parent: undefined,
      heightMultiplier: undefined,
      widthMultiplier: undefined,
      id: component ? parseInt(component.id.replace(/-/g, "").substring(0, 8), 16) : 0,
      parentCompId: component?.parent_component_id
        ? parseInt(component.parent_component_id.replace(/-/g, "").substring(0, 8), 16)
        : undefined,
      childCompId: undefined,
      functionDefId: undefined,
      componentType: component?.component_type || "TABLE",
      isNoise: component?.is_noise || false,
      orderSeq: component?.order_seq || undefined,
      fileType: undefined,
      fileName: undefined,
      childNoiseCount: 0,
      childNoNoiseCount: 0,
      parentFuncId: undefined,
      isDummyCall: undefined,
      componentDesc: component?.component_desc || undefined,
    }
  }

  /**
   * Create a placeholder node for cycle detection
   */
  private createCycleNode(component: ComponentMaster, config: LineageConfig): DbLineageVO {
    const nodeType = this.mapComponentToNodeType(component.component_type)
    const node = this.createLineageNode(
      `[Cycle] ${component.component_name}`,
      nodeType,
      config,
      component
    )
    node.id = 0 // Mark as cyclic
    return node
  }

  /**
   * Map component type to node type
   */
  private mapComponentToNodeType(componentType: ComponentType): NodeType {
    const mapping: Record<string, NodeType> = {
      TABLE: "TABLE",
      COLUMN: "COLUMN",
      PROCEDURE: "PROCEDURE",
      FUNCTION: "FUNCTION",
      FUNCTION_CALL: "FUNCTION",
      FUNCTION_DEFINITION: "FUNCTION",
      QUERY: "QUERY",
      FILE: "FUNCTION", // Map files to function for visualization
    }
    return mapping[componentType] || "FUNCTION"
  }

  /**
   * Get columns for a table as type information
   */
  private async getTableColumns(
    projectIds: string[],
    tableName: string
  ): Promise<TypeInformation[]> {
    // Try component_master
    let columns = await this.sql`
      SELECT 
        cm.id as component_id,
        cm.component_name as name,
        cm.component_desc
      FROM component_master cm
      JOIN component_master tbl ON cm.parent_component_id = tbl.id
      WHERE tbl.project_id = ANY(${projectIds})
        AND tbl.component_name = ${tableName}
        AND tbl.component_type = 'TABLE'
        AND cm.component_type = 'COLUMN'
      ORDER BY cm.component_name
    `

    // Fallback to db_columns
    if (columns.length === 0) {
      columns = await this.sql`
        SELECT 
          dc.id as component_id,
          dc.column_name as name,
          dc.data_type as component_desc
        FROM db_columns dc
        JOIN db_schemas ds ON dc.schema_id = ds.id
        WHERE ds.project_id = ANY(${projectIds})
          AND ds.table_name = ${tableName}
        ORDER BY dc.column_name
      `
    }

    return columns.map((col, index) => ({
      componentId: col.component_id as string,
      name: col.name as string,
      displayName: col.name as string,
      type: undefined,
      color: index % 2 === 0 ? "#b2f1ca" : "#FFFFFF", // Alternate colors
      sourceCode: undefined,
      columns: [],
      expanded: false,
    }))
  }

  /**
   * Extend lineage with ETL flow
   */
  private async extendWithEtlFlow(
    projectIds: string[],
    sourceTable: string,
    lineage: DbLineageVO
  ): Promise<DbLineageVO> {
    // Get ETL flow tree
    const flows = await this.sql`
      SELECT * FROM db_lineage_table_flow_master
      WHERE project_id = ANY(${projectIds})
        AND source_table = ${sourceTable}
      ORDER BY flow_sequence
    `

    if (flows.length === 0) {
      return lineage
    }

    // Build flow tree map
    const flowMap = new Map<string, DbLineageTableFlowMaster[]>()
    for (const flow of flows) {
      const key = flow.source_table as string
      if (!flowMap.has(key)) {
        flowMap.set(key, [])
      }
      flowMap.get(key)!.push(flow as unknown as DbLineageTableFlowMaster)
    }

    // Attach ETL children to appropriate procedure nodes
    this.attachEtlFlow(lineage, flowMap)

    return lineage
  }

  /**
   * Recursively attach ETL flow to lineage tree
   */
  private attachEtlFlow(
    node: DbLineageVO,
    flowMap: Map<string, DbLineageTableFlowMaster[]>
  ): void {
    if (node.type === "PROCEDURE") {
      const flows = flowMap.get(node.name)
      if (flows) {
        for (const flow of flows) {
          if (flow.target_table) {
            const etlNode: DbLineageVO = {
              ...this.createLineageNode(flow.target_table, "TABLE", {
                etlEnabled: true,
                columnColors: DEFAULT_NODE_COLORS,
                cacheTtl: 3600,
                maxHierarchyDepth: 10,
              }),
              componentDesc: `ETL: ${flow.flow_type || "TRANSFORM"}`,
            }
            node.children.push(etlNode)
          }
        }
      }
    }

    for (const child of node.children) {
      this.attachEtlFlow(child, flowMap)
    }
  }

  /**
   * Get component source code
   */
  async getComponentSource(componentId: string): Promise<{
    sourceComponentId: string
    parentComponentId?: string
    sourceCode: string
    startLine: number
    endLine: number
  } | null> {
    const cacheKey = CacheService.componentSourceKey(componentId)
    const cached = await cacheService.get(cacheKey)
    if (cached) return cached as typeof result

    const sources = await this.sql`
      SELECT 
        cs.component_id as source_component_id,
        cs.parent_component_id,
        cs.source_code,
        cs.start_line,
        cs.end_line
      FROM component_source cs
      WHERE cs.component_id = ${componentId}
      LIMIT 1
    `

    if (sources.length === 0) {
      return null
    }

    const result = {
      sourceComponentId: sources[0].source_component_id as string,
      parentComponentId: sources[0].parent_component_id as string | undefined,
      sourceCode: sources[0].source_code as string,
      startLine: sources[0].start_line as number,
      endLine: sources[0].end_line as number,
    }

    await cacheService.set(cacheKey, result, 3600)
    return result
  }

  /**
   * Create a lineage report entry
   */
  private async createLineageReport(
    projectId: string,
    tableName: string,
    columnName: string | null
  ): Promise<string> {
    const result = await this.sql`
      INSERT INTO db_lineage_report (project_id, table_name, column_name, status, started_at)
      VALUES (${projectId}, ${tableName}, ${columnName}, 'running', NOW())
      RETURNING id
    `
    return result[0].id as string
  }

  /**
   * Mark lineage report as completed
   */
  private async completeLineageReport(reportId: string, lineage: DbLineageVO): Promise<void> {
    await this.sql`
      UPDATE db_lineage_report
      SET status = 'completed', lineage_json = ${JSON.stringify(lineage)}, ended_at = NOW()
      WHERE id = ${reportId}
    `
  }

  /**
   * Mark lineage report as failed
   */
  private async failLineageReport(reportId: string, error: string | undefined): Promise<void> {
    await this.sql`
      UPDATE db_lineage_report
      SET status = 'failed', exception_stack_trace = ${error || 'Unknown error'}, ended_at = NOW()
      WHERE id = ${reportId}
    `
  }

  /**
   * Save lineage result
   */
  private async saveLineageResult(
    projectIds: string[],
    tableName: string,
    columnName: string | null,
    lineage: DbLineageVO
  ): Promise<void> {
    const dataLineageType = columnName ? "COLUMN" : "TABLE"

    // Upsert
    await this.sql`
      INSERT INTO db_lineage_result (
        project_id, data_lineage_type, table_name, column_name, lineage_data, updated_at
      )
      VALUES (${projectIds[0]}, ${dataLineageType}, ${tableName}, ${columnName}, ${JSON.stringify(lineage)}, NOW())
      ON CONFLICT (project_id, table_name, column_name)
      DO UPDATE SET lineage_data = ${JSON.stringify(lineage)}, updated_at = NOW()
    `
  }

  /**
   * Invalidate cache for a project
   */
  async invalidateCache(projectId: string): Promise<void> {
    await cacheService.invalidateProject(projectId)
  }
}

// Singleton instance
export const lineageService = new LineageService()
