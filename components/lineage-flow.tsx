"use client"

import React, { useCallback, useMemo, useState } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
  ConnectionLineType,
} from "reactflow"
import "reactflow/dist/style.css"
import { getLanguageConfig } from "@/lib/languages"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Key,
  Link2,
  FileCode,
  Database,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Search,
  Maximize2,
  Layers,
  Eye,
  EyeOff,
  X,
  Circle,
} from "lucide-react"

interface LineageUsage {
  usage_id: string
  usage_type: string
  line_number: number
  code_snippet: string
  column_id: string
  column_name: string
  data_type: string
  is_primary_key: boolean
  is_foreign_key: boolean
  foreign_table: string | null
  foreign_column: string | null
  ai_description: string | null
  table_name: string
  file_id: string
  file_path: string
  language: string
}

interface LineageFlowProps {
  usages: LineageUsage[]
  onUsageClick?: (usage: LineageUsage) => void
}

/* ─────────── USAGE TYPE COLORS ─────────── */
const USAGE_COLORS: Record<string, string> = {
  read: "#10b981",
  write: "#f59e0b",
  update: "#eab308",
  delete: "#ef4444",
  join: "#8b5cf6",
  filter: "#3b82f6",
  projection: "#06b6d4",
}

/* ─────────── COMPACT TABLE NODE ─────────── */
function TableNode({
  data,
  selected,
}: {
  data: {
    label: string
    columns: {
      name: string
      type: string
      isPK: boolean
      isFK: boolean
      usageCount: number
    }[]
    isExpanded: boolean
    onToggleExpand: () => void
  }
  selected: boolean
}) {
  const visibleColumns = data.isExpanded ? data.columns : data.columns.slice(0, 5)
  const hasMoreColumns = data.columns.length > 5

  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-lg border bg-card shadow-md transition-all duration-200 ${
        selected
          ? "border-primary ring-2 ring-primary/20 shadow-lg"
          : "border-border hover:border-primary/50 hover:shadow-lg"
      }`}
    >
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-background !right-[-5px]"
      />
      
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2.5 rounded-t-lg cursor-pointer"
        onClick={data.onToggleExpand}
      >
        <Database className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="text-sm font-semibold text-foreground truncate flex-1">
          {data.label}
        </span>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {data.columns.length}
        </span>
        {hasMoreColumns && (
          data.isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )
        )}
      </div>
      
      {/* Columns */}
      <div className="py-1">
        {visibleColumns.map((col) => (
          <div
            key={col.name}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 transition-colors"
          >
            <span className="w-4 flex items-center justify-center shrink-0">
              {col.isPK ? (
                <Key className="h-3 w-3 text-amber-500" />
              ) : col.isFK ? (
                <Link2 className="h-3 w-3 text-blue-500" />
              ) : (
                <Circle className="h-1.5 w-1.5 fill-muted-foreground/40 text-muted-foreground/40" />
              )}
            </span>
            <span className="text-xs font-mono text-foreground truncate flex-1">
              {col.name}
            </span>
            <span className="text-[9px] text-muted-foreground shrink-0">
              {col.type}
            </span>
            {col.usageCount > 0 && (
              <span className="text-[9px] font-medium text-emerald-600 bg-emerald-500/10 rounded px-1">
                {col.usageCount}
              </span>
            )}
          </div>
        ))}
        
        {hasMoreColumns && !data.isExpanded && (
          <div
            className="flex items-center justify-center gap-1 py-1.5 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground hover:bg-muted/30"
            onClick={data.onToggleExpand}
          >
            <span>+{data.columns.length - 5} more</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────── COMPACT FILE NODE ─────────── */
function FileNode({
  data,
  selected,
}: {
  data: {
    label: string
    filePath: string
    language: string
    usages: { column: string; table: string; type: string; line: number }[]
    isExpanded: boolean
    onToggleExpand: () => void
  }
  selected: boolean
}) {
  const config = getLanguageConfig(data.language)
  const visibleUsages = data.isExpanded ? data.usages : data.usages.slice(0, 4)
  const hasMore = data.usages.length > 4

  // Group usages by type for summary
  const usageTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    data.usages.forEach((u) => {
      counts[u.type] = (counts[u.type] || 0) + 1
    })
    return counts
  }, [data.usages])

  return (
    <div
      className={`min-w-[260px] max-w-[320px] rounded-lg border shadow-md transition-all duration-200 ${
        selected
          ? "ring-2 shadow-lg"
          : "hover:shadow-lg"
      }`}
      style={{
        backgroundColor: config.bgColor,
        borderColor: selected ? config.color : config.borderColor,
        ...(selected && { "--tw-ring-color": `${config.color}33` } as React.CSSProperties),
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !border-2 !border-background !left-[-5px]"
        style={{ backgroundColor: config.color }}
      />
      
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b cursor-pointer"
        style={{ borderColor: config.borderColor }}
        onClick={data.onToggleExpand}
      >
        <FileCode className="h-4 w-4 shrink-0" style={{ color: config.color }} />
        <span className="text-sm font-semibold truncate flex-1" style={{ color: config.color }}>
          {data.label}
        </span>
        <span
          className="text-[9px] font-medium px-1.5 py-0.5 rounded"
          style={{ color: config.color, backgroundColor: `${config.color}15` }}
        >
          {config.label}
        </span>
        {hasMore && (
          data.isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" style={{ color: config.color }} />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" style={{ color: config.color }} />
          )
        )}
      </div>
      
      {/* Usage Type Summary */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b" style={{ borderColor: config.borderColor }}>
        {Object.entries(usageTypeCounts).map(([type, count]) => (
          <span
            key={type}
            className="text-[9px] font-medium px-1.5 py-0.5 rounded"
            style={{
              color: USAGE_COLORS[type] || "#6b7280",
              backgroundColor: `${USAGE_COLORS[type] || "#6b7280"}15`,
            }}
          >
            {type}: {count}
          </span>
        ))}
      </div>
      
      {/* Usages */}
      <div className="py-1 max-h-[140px] overflow-y-auto">
        {visibleUsages.map((u, idx) => (
          <div
            key={`${u.column}-${u.line}-${idx}`}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-black/5"
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: USAGE_COLORS[u.type] || "#6b7280" }}
            />
            <span className="font-mono truncate flex-1" style={{ color: config.color }}>
              {u.table}.{u.column}
            </span>
            <span className="text-muted-foreground shrink-0">L{u.line}</span>
          </div>
        ))}
        
        {hasMore && !data.isExpanded && (
          <div
            className="flex items-center justify-center py-1.5 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground"
            onClick={data.onToggleExpand}
          >
            +{data.usages.length - 4} more
          </div>
        )}
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
  fileNode: FileNode,
}

/* ─────────── FLOW INNER COMPONENT ─────────── */
function LineageFlowInner({
  usages,
  onUsageClick,
  searchQuery,
  expandedNodes,
  toggleNodeExpand,
}: {
  usages: LineageUsage[]
  onUsageClick?: (usage: LineageUsage) => void
  searchQuery: string
  expandedNodes: Set<string>
  toggleNodeExpand: (nodeId: string) => void
}) {
  const reactFlowInstance = useReactFlow()

  const { nodes, edges } = useMemo(() => {
    if (!usages.length) return { nodes: [], edges: [] }

    /* ---------- 1. Aggregate tables + their unique columns ---------- */
    const tableColumnsMap = new Map<
      string,
      Map<string, { columnId: string; name: string; type: string; isPK: boolean; isFK: boolean }>
    >()

    for (const u of usages) {
      if (!tableColumnsMap.has(u.table_name)) tableColumnsMap.set(u.table_name, new Map())
      const cols = tableColumnsMap.get(u.table_name)!
      if (!cols.has(u.column_name)) {
        cols.set(u.column_name, {
          columnId: u.column_id,
          name: u.column_name,
          type: u.data_type,
          isPK: u.is_primary_key,
          isFK: u.is_foreign_key,
        })
      }
    }

    /* ---------- 2. Filter based on search query ---------- */
    const query = searchQuery.toLowerCase()
    const filteredTables = query
      ? Array.from(tableColumnsMap.entries()).filter(([tableName, cols]) => {
          if (tableName.toLowerCase().includes(query)) return true
          for (const [colName] of cols) {
            if (colName.toLowerCase().includes(query)) return true
          }
          return false
        })
      : Array.from(tableColumnsMap.entries())

    /* ---------- 3. Aggregate column usage counts ---------- */
    const columnKey = (table: string, col: string) => `${table}::${col}`
    const columnFiles = new Map<string, Set<string>>()

    for (const u of usages) {
      const ck = columnKey(u.table_name, u.column_name)
      if (!columnFiles.has(ck)) columnFiles.set(ck, new Set())
      columnFiles.get(ck)!.add(u.file_id)
    }

    /* ---------- 4. Aggregate files ---------- */
    const fileUsagesMap = new Map<
      string,
      { fileId: string; filePath: string; language: string; usages: { column: string; table: string; type: string; line: number }[] }
    >()

    for (const u of usages) {
      if (!fileUsagesMap.has(u.file_id)) {
        fileUsagesMap.set(u.file_id, {
          fileId: u.file_id,
          filePath: u.file_path,
          language: u.language,
          usages: [],
        })
      }
      fileUsagesMap.get(u.file_id)!.usages.push({
        column: u.column_name,
        table: u.table_name,
        type: u.usage_type,
        line: u.line_number,
      })
    }

    /* ---------- 5. Layout - Horizontal with proper spacing ---------- */
    const TABLE_X = 50
    const FILE_X = 800
    const NODE_GAP_Y = 20
    const BASE_TABLE_HEIGHT = 120
    const BASE_FILE_HEIGHT = 160
    const ROW_HEIGHT = 28

    const generatedNodes: Node[] = []
    const generatedEdges: Edge[] = []

    /* ---------- 6. Position tables on left ---------- */
    let tableY = 50

    for (const [tableName, cols] of filteredTables) {
      const colsArray = Array.from(cols.values())
      const colUsageCounts = colsArray.map((c) => {
        const ck = columnKey(tableName, c.name)
        return columnFiles.get(ck)?.size || 0
      })

      const isExpanded = expandedNodes.has(`table-${tableName}`)
      const visibleCount = isExpanded ? colsArray.length : Math.min(5, colsArray.length)
      const nodeHeight = BASE_TABLE_HEIGHT + (visibleCount - 3) * ROW_HEIGHT

      generatedNodes.push({
        id: `table-${tableName}`,
        type: "tableNode",
        position: { x: TABLE_X, y: tableY },
        data: {
          label: tableName,
          columns: colsArray.map((c, i) => ({
            name: c.name,
            type: c.type,
            isPK: c.isPK,
            isFK: c.isFK,
            usageCount: colUsageCounts[i],
          })),
          isExpanded,
          onToggleExpand: () => toggleNodeExpand(`table-${tableName}`),
        },
      })

      tableY += nodeHeight + NODE_GAP_Y
    }

    /* ---------- 7. Position files on right ---------- */
    let fileY = 50
    const fileNodeIds = new Map<string, string>()

    // Sort files by language for visual grouping
    const sortedFiles = Array.from(fileUsagesMap.values()).sort((a, b) =>
      a.language.localeCompare(b.language)
    )

    for (const file of sortedFiles) {
      const nodeId = `file-${file.fileId}`
      fileNodeIds.set(file.fileId, nodeId)

      const fileName = file.filePath.split("/").pop() || file.filePath
      const isExpanded = expandedNodes.has(nodeId)
      const visibleCount = isExpanded ? file.usages.length : Math.min(4, file.usages.length)
      const nodeHeight = BASE_FILE_HEIGHT + (visibleCount - 2) * ROW_HEIGHT

      generatedNodes.push({
        id: nodeId,
        type: "fileNode",
        position: { x: FILE_X, y: fileY },
        data: {
          label: fileName,
          filePath: file.filePath,
          language: file.language,
          usages: file.usages,
          isExpanded,
          onToggleExpand: () => toggleNodeExpand(nodeId),
        },
      })

      fileY += nodeHeight + NODE_GAP_Y
    }

    /* ---------- 8. Create edges from tables to files ---------- */
    const tableFileEdges = new Map<string, { tables: Set<string>; types: Set<string> }>()

    for (const u of usages) {
      const fileNodeId = fileNodeIds.get(u.file_id)
      if (!fileNodeId) continue

      const edgeKey = `table-${u.table_name}->${fileNodeId}`
      if (!tableFileEdges.has(edgeKey)) {
        tableFileEdges.set(edgeKey, { tables: new Set(), types: new Set() })
      }
      tableFileEdges.get(edgeKey)!.tables.add(u.table_name)
      tableFileEdges.get(edgeKey)!.types.add(u.usage_type)
    }

    for (const [edgeKey, { types }] of tableFileEdges) {
      const [source, target] = edgeKey.split("->")
      const fileId = target.replace("file-", "")
      const file = fileUsagesMap.get(fileId)
      const config = file ? getLanguageConfig(file.language) : { color: "#6b7280" }

      // Determine edge color based on primary usage type
      const primaryType = Array.from(types)[0]
      const edgeColor = USAGE_COLORS[primaryType] || config.color

      generatedEdges.push({
        id: `e-${edgeKey}`,
        source,
        target,
        type: "smoothstep",
        animated: types.has("write") || types.has("update") || types.has("delete"),
        style: {
          stroke: edgeColor,
          strokeWidth: 2,
          opacity: 0.7,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
          width: 16,
          height: 12,
        },
      })
    }

    return { nodes: generatedNodes, edges: generatedEdges }
  }, [usages, searchQuery, expandedNodes, toggleNodeExpand])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "fileNode" && onUsageClick) {
        const fileId = node.id.replace("file-", "")
        const usage = usages.find((u) => u.file_id === fileId)
        if (usage) onUsageClick(usage)
      }
    },
    [usages, onUsageClick]
  )

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.1, duration: 300 })
  }, [reactFlowInstance])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      minZoom={0.3}
      maxZoom={1.5}
      defaultEdgeOptions={{
        type: "smoothstep",
      }}
      connectionLineType={ConnectionLineType.SmoothStep}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} size={1} color="hsl(var(--border) / 0.3)" />
      <Controls
        className="!bg-card !border !shadow-sm !rounded-lg overflow-hidden [&>button]:!bg-card [&>button]:!border-t-0 [&>button]:!border-x-0 [&>button]:!border-border [&>button]:hover:!bg-muted"
        showInteractive={false}
      />
      <MiniMap
        nodeColor={(n) => {
          if (n.type === "tableNode") return "#10b981"
          if (n.type === "fileNode") return getLanguageConfig(n.data?.language).color
          return "#6b7280"
        }}
        className="!bg-card !border !rounded-lg"
        maskColor="hsl(var(--background) / 0.85)"
        pannable
        zoomable
      />
      <Panel position="bottom-right" className="!mb-2 !mr-2">
        <Button variant="secondary" size="sm" onClick={handleFitView} className="shadow-sm h-8">
          <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
          Fit
        </Button>
      </Panel>
    </ReactFlow>
  )
}

/* ─────────── MAIN COMPONENT ─────────── */
export function LineageFlow({ usages, onUsageClick }: LineageFlowProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const toggleNodeExpand = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  const expandAll = useCallback(() => {
    const allNodeIds = new Set<string>()
    const tables = new Set(usages.map((u) => u.table_name))
    const files = new Set(usages.map((u) => `file-${u.file_id}`))
    tables.forEach((t) => allNodeIds.add(`table-${t}`))
    files.forEach((f) => allNodeIds.add(f))
    setExpandedNodes(allNodeIds)
  }, [usages])

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set())
  }, [])

  // Stats
  const stats = useMemo(() => {
    const tables = new Set(usages.map((u) => u.table_name)).size
    const columns = new Set(usages.map((u) => `${u.table_name}.${u.column_name}`)).size
    const files = new Set(usages.map((u) => u.file_id)).size
    return { tables, columns, files }
  }, [usages])

  if (usages.length === 0) {
    return (
      <div className="flex h-[500px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/5">
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="p-3 rounded-lg bg-muted/20">
            <Database className="h-6 w-6" />
          </div>
          <ArrowRight className="h-5 w-5" />
          <div className="p-3 rounded-lg bg-muted/20">
            <FileCode className="h-6 w-6" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">No Lineage Data</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload source code with SQL schema files to generate lineage
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 border-b bg-muted/30">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tables, columns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm bg-background"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Stats */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 font-normal h-7">
            <Database className="h-3 w-3 text-emerald-500" />
            <span className="font-medium">{stats.tables}</span>
            <span className="text-muted-foreground">tables</span>
          </Badge>
          <Badge variant="secondary" className="gap-1.5 font-normal h-7">
            <Layers className="h-3 w-3 text-blue-500" />
            <span className="font-medium">{stats.columns}</span>
            <span className="text-muted-foreground">columns</span>
          </Badge>
          <Badge variant="secondary" className="gap-1.5 font-normal h-7">
            <FileCode className="h-3 w-3 text-orange-500" />
            <span className="font-medium">{stats.files}</span>
            <span className="text-muted-foreground">files</span>
          </Badge>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Actions */}
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={expandAll} className="h-8 px-2">
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Expand
                </Button>
              </TooltipTrigger>
              <TooltipContent>Expand all nodes</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={collapseAll} className="h-8 px-2">
                  <EyeOff className="h-3.5 w-3.5 mr-1" />
                  Collapse
                </Button>
              </TooltipTrigger>
              <TooltipContent>Collapse all nodes</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-3">
          {Object.entries(USAGE_COLORS).slice(0, 4).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-muted-foreground capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flow Diagram - Full Width */}
      <div className="flex-1 min-h-[600px]">
        <ReactFlowProvider>
          <LineageFlowInner
            usages={usages}
            onUsageClick={onUsageClick}
            searchQuery={searchQuery}
            expandedNodes={expandedNodes}
            toggleNodeExpand={toggleNodeExpand}
          />
        </ReactFlowProvider>
      </div>
    </div>
  )
}
