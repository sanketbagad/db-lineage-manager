"use client"

import React, { useCallback, useMemo } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
} from "reactflow"
import "reactflow/dist/style.css"
import { getLanguageConfig } from "@/lib/languages"
import { Badge } from "@/components/ui/badge"
import { Key, Link2, FileCode, Table, ArrowRight } from "lucide-react"

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
  read: "#22c55e",
  write: "#f97316",
  update: "#eab308",
  delete: "#ef4444",
  join: "#a855f7",
  filter: "#3b82f6",
  projection: "#06b6d4",
}

/* ─────────── TABLE NODE ─────────── */
function TableNode({
  data,
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
  }
}) {
  return (
    <div className="min-w-[260px] rounded-xl border border-primary/40 bg-card shadow-xl hover:shadow-2xl transition-shadow">
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-primary !w-3 !h-3 !border-2 !border-background"
      />
      <div className="flex items-center gap-2 rounded-t-xl border-b border-primary/20 bg-primary/8 px-4 py-3">
        <Table className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-primary">{data.label}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] px-2 py-0.5">
          {data.columns.length} cols
        </Badge>
      </div>
      <div className="flex flex-col py-2">
        {data.columns.map((col) => (
          <div
            key={col.name}
            className="group flex items-center gap-2 px-4 py-1.5 hover:bg-muted/50 transition-colors"
          >
            <span className="w-4 flex items-center justify-center">
              {col.isPK ? (
                <Key className="h-3 w-3 text-amber-400" />
              ) : col.isFK ? (
                <Link2 className="h-3 w-3 text-sky-400" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              )}
            </span>
            <span className="text-xs font-mono font-medium text-foreground">
              {col.name}
            </span>
            <span className="text-[10px] text-muted-foreground">{col.type}</span>
            {col.usageCount > 0 && (
              <span className="ml-auto text-[9px] font-medium text-primary bg-primary/10 rounded-full px-1.5">
                {col.usageCount}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────── COLUMN NODE (deduplicated) ─────────── */
function ColumnNode({
  data,
}: {
  data: {
    label: string
    type: string
    tableName: string
    isPK: boolean
    isFK: boolean
    usageTypes: string[]
    fileCount: number
  }
}) {
  return (
    <div className="rounded-xl border border-muted-foreground/30 bg-card px-4 py-3 shadow-md min-w-[200px] hover:shadow-lg transition-shadow">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-primary !w-2.5 !h-2.5 !border-2 !border-background"
      />
      <div className="flex items-center gap-1.5 mb-2">
        {data.isPK && <Key className="h-3 w-3 text-amber-400" />}
        {data.isFK && <Link2 className="h-3 w-3 text-sky-400" />}
        <span className="text-[9px] text-muted-foreground font-medium">{data.tableName}</span>
      </div>
      <div className="text-xs font-mono font-bold text-foreground mb-2">
        {data.label}
      </div>
      <div className="text-[9px] text-muted-foreground mb-2.5 font-medium">{data.type}</div>
      <div className="flex flex-wrap gap-1">
        {data.usageTypes.map((ut) => (
          <span
            key={ut}
            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              color: USAGE_COLORS[ut] || "#9ca3af",
              backgroundColor: `${USAGE_COLORS[ut] || "#9ca3af"}18`,
            }}
          >
            {ut}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[8px] text-muted-foreground font-medium">
        <ArrowRight className="h-3 w-3" />
        <span>{data.fileCount} file{data.fileCount !== 1 ? "s" : ""}</span>
      </div>
    </div>
  )
}

/* ─────────── FILE NODE (deduplicated) ─────────── */
function FileNode({
  data,
}: {
  data: {
    label: string
    filePath: string
    language: string
    usages: { column: string; table: string; type: string; line: number }[]
  }
}) {
  const config = getLanguageConfig(data.language)

  return (
    <div
      className="max-w-[340px] min-w-[280px] rounded-xl border shadow-lg hover:shadow-xl transition-shadow"
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !border-2 !border-background"
        style={{ backgroundColor: config.color }}
      />
      <div
        className="flex items-center gap-2 px-4 py-3 border-b rounded-t-xl"
        style={{ borderColor: config.borderColor }}
      >
        <FileCode className="h-4 w-4 shrink-0" style={{ color: config.color }} />
        <span
          className="text-sm font-bold truncate"
          style={{ color: config.color }}
        >
          {data.label}
        </span>
        <Badge
          variant="outline"
          className="ml-auto text-[8px] px-2 py-1 shrink-0 font-medium"
          style={{ color: config.color, borderColor: config.borderColor }}
        >
          {config.label}
        </Badge>
      </div>
      <div className="px-4 py-3 space-y-1.5 max-h-[150px] overflow-y-auto">
        <div className="text-[9px] text-muted-foreground truncate font-medium">{data.filePath}</div>
        {data.usages.slice(0, 4).map((u, idx) => (
          <div
            key={`${u.column}-${u.line}-${idx}`}
            className="flex items-center gap-1.5 text-[10px]"
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: USAGE_COLORS[u.type] || "#9ca3af" }}
            />
            <span className="font-mono" style={{ color: config.color }}>
              {u.table}.{u.column}
            </span>
            <span className="text-muted-foreground">L{u.line}</span>
            <span
              className="text-[9px] px-1 rounded"
              style={{
                color: USAGE_COLORS[u.type] || "#9ca3af",
                backgroundColor: `${USAGE_COLORS[u.type] || "#9ca3af"}18`,
              }}
            >
              {u.type}
            </span>
          </div>
        ))}
        {data.usages.length > 4 && (
          <div className="text-[9px] text-muted-foreground">
            +{data.usages.length - 4} more
          </div>
        )}
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
  columnNode: ColumnNode,
  fileNode: FileNode,
}

/* ─────────── MAIN COMPONENT ─────────── */
export function LineageFlow({ usages, onUsageClick }: LineageFlowProps) {
  const { nodes, edges } = useMemo(() => {
    if (!usages.length) return { nodes: [], edges: [] }

    /* ---------- 1. Aggregate tables + their unique columns ---------- */
    const tableColumnsMap = new Map<
      string,
      Map<
        string,
        {
          columnId: string
          name: string
          type: string
          isPK: boolean
          isFK: boolean
        }
      >
    >()

    for (const u of usages) {
      if (!tableColumnsMap.has(u.table_name))
        tableColumnsMap.set(u.table_name, new Map())
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

    /* ---------- 2. Aggregate columns -> unique usage types & file count ---------- */
    const columnKey = (table: string, col: string) => `${table}::${col}`

    const columnUsageTypes = new Map<string, Set<string>>()
    const columnFiles = new Map<string, Set<string>>()

    for (const u of usages) {
      const ck = columnKey(u.table_name, u.column_name)
      if (!columnUsageTypes.has(ck)) columnUsageTypes.set(ck, new Set())
      columnUsageTypes.get(ck)!.add(u.usage_type)
      if (!columnFiles.has(ck)) columnFiles.set(ck, new Set())
      columnFiles.get(ck)!.add(u.file_id)
    }

    /* ---------- 3. Aggregate files (deduplicated) ---------- */
    const fileUsagesMap = new Map<
      string,
      {
        fileId: string
        filePath: string
        language: string
        usages: { column: string; table: string; type: string; line: number }[]
      }
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

    /* ---------- 4. Layout constants ---------- */
    const COL_TABLE_X = 0
    const COL_COLUMN_X = 420
    const COL_FILE_X = 920
    const TABLE_ROW_H = 22
    const TABLE_GAP = 40
    const COLUMN_NODE_H = 120
    const COLUMN_GAP = 20
    const FILE_NODE_H = 140
    const FILE_GAP = 24

    const generatedNodes: Node[] = []
    const generatedEdges: Edge[] = []

    /* ---------- 5. Table nodes (left) ---------- */
    let tableY = 0
    const tableYPositions = new Map<string, number>()

    for (const [tableName, cols] of tableColumnsMap) {
      const colsArray = Array.from(cols.values())
      const colUsageCounts = colsArray.map((c) => {
        const ck = columnKey(tableName, c.name)
        return (columnFiles.get(ck)?.size || 0)
      })

      generatedNodes.push({
        id: `table-${tableName}`,
        type: "tableNode",
        position: { x: COL_TABLE_X, y: tableY },
        data: {
          label: tableName,
          columns: colsArray.map((c, i) => ({
            name: c.name,
            type: c.type,
            isPK: c.isPK,
            isFK: c.isFK,
            usageCount: colUsageCounts[i],
          })),
        },
      })

      tableYPositions.set(tableName, tableY)
      tableY += colsArray.length * TABLE_ROW_H + 60 + TABLE_GAP
    }

    /* ---------- 6. Column nodes (center, one per unique column) ---------- */
    let colY = 0
    const columnNodeIds = new Map<string, string>()

    for (const [tableName, cols] of tableColumnsMap) {
      for (const [colName, colInfo] of cols) {
        const ck = columnKey(tableName, colName)
        const nodeId = `col-${ck}`
        columnNodeIds.set(ck, nodeId)

        const uTypes = Array.from(columnUsageTypes.get(ck) || [])
        const fCount = columnFiles.get(ck)?.size || 0

        generatedNodes.push({
          id: nodeId,
          type: "columnNode",
          position: { x: COL_COLUMN_X, y: colY },
          data: {
            label: colName,
            type: colInfo.type,
            tableName,
            isPK: colInfo.isPK,
            isFK: colInfo.isFK,
            usageTypes: uTypes,
            fileCount: fCount,
          },
        })

        // Edge: table -> column
        generatedEdges.push({
          id: `e-table-${tableName}-to-${nodeId}`,
          source: `table-${tableName}`,
          target: nodeId,
          animated: true,
          style: { stroke: "hsl(var(--primary))", strokeWidth: 1.5, opacity: 0.6 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "hsl(var(--primary))",
            width: 16,
            height: 12,
          },
        })

        colY += COLUMN_NODE_H + COLUMN_GAP
      }
    }

    /* ---------- 7. File nodes (right, one per unique file) ---------- */
    let fileY = 0
    const fileNodeIds = new Map<string, string>()

    const sortedFiles = Array.from(fileUsagesMap.values()).sort((a, b) =>
      a.language.localeCompare(b.language)
    )

    for (const file of sortedFiles) {
      const nodeId = `file-${file.fileId}`
      fileNodeIds.set(file.fileId, nodeId)

      const fileName = file.filePath.split("/").pop() || file.filePath

      generatedNodes.push({
        id: nodeId,
        type: "fileNode",
        position: { x: COL_FILE_X, y: fileY },
        data: {
          label: fileName,
          filePath: file.filePath,
          language: file.language,
          usages: file.usages,
        },
      })

      fileY += FILE_NODE_H + FILE_GAP
    }

    /* ---------- 8. Edges: column -> file (one per unique pair) ---------- */
    const edgeSet = new Set<string>()

    for (const u of usages) {
      const ck = columnKey(u.table_name, u.column_name)
      const colNodeId = columnNodeIds.get(ck)
      const fileNodeId = fileNodeIds.get(u.file_id)
      if (!colNodeId || !fileNodeId) continue

      const edgeKey = `${colNodeId}->${fileNodeId}`
      if (edgeSet.has(edgeKey)) continue
      edgeSet.add(edgeKey)

      const config = getLanguageConfig(u.language)

      generatedEdges.push({
        id: `e-${edgeKey}`,
        source: colNodeId,
        target: fileNodeId,
        style: { stroke: config.color, strokeWidth: 1.5, opacity: 0.7 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: config.color,
          width: 14,
          height: 10,
        },
      })
    }

    return { nodes: generatedNodes, edges: generatedEdges }
  }, [usages])

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

  if (usages.length === 0) {
    return (
      <div className="flex h-[500px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Table className="h-5 w-5" />
          <ArrowRight className="h-4 w-4" />
          <FileCode className="h-5 w-5" />
        </div>
        <p className="text-sm text-muted-foreground">
          No column lineage data found. Upload source code with SQL schema files
          to generate lineage.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full h-[750px] rounded-xl border-2 border-border/50 bg-card/80 backdrop-blur-sm">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color="hsl(var(--border))" />
        <Controls className="!bg-card !border-border !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === "tableNode") return "hsl(var(--primary))"
            if (n.type === "fileNode") {
              return getLanguageConfig(n.data?.language).color
            }
            return "hsl(var(--muted-foreground))"
          }}
          className="!bg-card !border-border"
          maskColor="hsl(var(--background) / 0.7)"
        />
      </ReactFlow>
    </div>
  )
}
