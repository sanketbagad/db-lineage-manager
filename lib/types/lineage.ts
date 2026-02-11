// Component Types based on DB Lineage Feature Specification

export type ComponentType =
  | "TABLE"
  | "COLUMN"
  | "PROCEDURE"
  | "FUNCTION"
  | "QUERY"
  | "FUNCTION_CALL"
  | "FUNCTION_DEFINITION"
  | "CREATE_TABLE_STATEMENT"
  | "CREATE_COLUMN_DEFINITION"

export type NodeType = "TABLE" | "PROCEDURE" | "QUERY" | "FUNCTION" | "COLUMN"

export type DataLineageType = "TABLE" | "COLUMN"

export type UsageType =
  | "read"
  | "write"
  | "update"
  | "delete"
  | "join"
  | "filter"
  | "projection"

export type FlowType = "ETL" | "TRANSFORM" | "LOAD" | "EXTRACT"

export type RelationshipType = "CONTAINS" | "CALLS" | "REFERENCES" | "USES"

// Database Models
export interface Application {
  id: string
  name: string
  description?: string
  created_at: Date
  updated_at: Date
}

export interface Project {
  id: string
  user_id: string
  application_id?: string
  name: string
  description?: string
  repo_url?: string
  blob_url?: string
  status: "pending" | "processing" | "completed" | "failed"
  created_at: Date
  updated_at: Date
}

export interface ComponentMaster {
  id: string
  project_id: string
  source_file_id?: string
  component_name: string
  component_type: ComponentType
  component_desc?: string
  display_name?: string
  parent_component_id?: string
  is_noise: boolean
  node_type?: NodeType
  color?: string
  order_seq?: number
  created_at: Date
}

export interface ComponentTrace {
  id: string
  fk_parent_component_id: string
  fk_child_component_id: string
  fk_parent_func_id?: string
  relationship_type?: RelationshipType
  created_at: Date
}

export interface FunctionCallHierarchy {
  id: string
  parent_id: string
  child_id: string
  hierarchy_level: string // L1, L2, etc.
  call_order?: number
  created_at: Date
}

export interface FunctionCallMaster {
  id: string
  caller_component_id: string
  callee_component_id?: string
  function_def_id?: string
  is_dummy_call: boolean
  call_type?: "DIRECT" | "INDIRECT" | "DYNAMIC"
  created_at: Date
}

export interface ComponentSource {
  id: string
  component_id: string
  parent_component_id?: string
  source_code?: string
  start_line?: number
  end_line?: number
  created_at: Date
}

export interface DbLineageResult {
  id: string
  project_id: string
  data_lineage_type: DataLineageType
  table_name: string
  column_name?: string
  root_component_id?: string
  lineage_data?: DbLineageVO
  created_at: Date
  updated_at: Date
}

export interface DbLineageReport {
  id: string
  project_id: string
  table_name: string
  column_name?: string
  lineage_json?: DbLineageVO
  exception_stack_trace?: string
  started_at?: Date
  ended_at?: Date
  status: "pending" | "running" | "completed" | "failed"
  created_at: Date
}

export interface DbLineageTableFlowMaster {
  id: string
  project_id: string
  source_table: string
  target_table?: string
  procedure_id?: string
  procedure_name?: string
  flow_sequence?: number
  flow_type?: FlowType
  parent_flow_id?: string
  created_at: Date
}

export interface SystemControl {
  id: string
  config_key: string
  config_value?: string
  description?: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// Lineage Value Objects (API Response types)
export interface TypeInformation {
  componentId?: string
  name: string
  displayName: string
  type?: string
  color: string
  sourceCode?: string
  columns: TypeInformation[]
  expanded: boolean
}

export interface DbLineageVO {
  dataLineageId?: string
  component_Id?: string
  name: string
  displayName: string
  type: NodeType
  color: string
  sourceCode?: string
  children: DbLineageVO[]
  typeInformations: TypeInformation[]
  parent?: string
  heightMultiplier?: number
  widthMultiplier?: number
  id: number
  parentCompId?: number
  childCompId?: number
  functionDefId?: number
  componentType: ComponentType
  isNoise?: boolean
  orderSeq?: number
  fileType?: string
  fileName?: string
  childNoiseCount: number
  childNoNoiseCount: number
  parentFuncId?: number
  isDummyCall?: "YES" | "NO"
  componentDesc?: string
}

// API Request/Response types
export interface GetSchemasByAppIdResponse {
  schemas: ProjectSchema[]
}

export interface ProjectSchema {
  projectId: string
  projectName: string
  tables: TableInfo[]
}

export interface TableInfo {
  tableName: string
  columns: ColumnInfo[]
}

export interface ColumnInfo {
  columnId: string
  columnName: string
  dataType?: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  foreignTable?: string
  foreignColumn?: string
}

export interface GetTablesResponse {
  tables: Map<string, ColumnInfo[]>
}

export interface GetLineageRequest {
  projectIds: string[]
  tableName: string
  columnName?: string // "null" for full table lineage
  regenerate: boolean
}

export interface GetLineageResponse {
  lineage: DbLineageVO
  fromCache: boolean
  generatedAt: Date
}

export interface ComponentSourceResponse {
  sourceComponentId: string
  parentComponentId?: string
  sourceCode: string
  startLine: number
  endLine: number
}

// Configuration types
export interface LineageConfig {
  etlEnabled: boolean
  columnColors: Record<NodeType, string>
  cacheTtl: number
  maxHierarchyDepth: number
}

// Default colors from documentation
export const DEFAULT_NODE_COLORS: Record<NodeType, string> = {
  TABLE: "#82c158",
  QUERY: "#0a9ccd",
  PROCEDURE: "#c34474",
  FUNCTION: "#5283a2",
  COLUMN: "#b2f1ca",
}

// Layer assignment from documentation
export const NODE_LAYERS: Record<NodeType, number> = {
  TABLE: 0, // Root
  PROCEDURE: 1, // Level 1
  QUERY: 2, // Level 2
  FUNCTION: 3, // Level 3
  COLUMN: 4, // Level 4
}
