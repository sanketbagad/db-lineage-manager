"use client"

import { getLanguageConfig } from "@/lib/languages"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Key,
  Link2,
  FileCode,
  Sparkles,
  Database,
  Hash,
} from "lucide-react"

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

interface ColumnMapProps {
  columnSummaries: ColumnSummary[]
}

const usageColors: Record<string, string> = {
  read: "hsl(var(--chart-2))",
  write: "hsl(var(--chart-1))",
  update: "hsl(var(--chart-3))",
  delete: "hsl(var(--destructive))",
  join: "hsl(var(--chart-4))",
  filter: "hsl(var(--chart-5))",
  projection: "hsl(var(--primary))",
}

export function ColumnMap({ columnSummaries }: ColumnMapProps) {
  // Group by table
  const tables = new Map<string, ColumnSummary[]>()
  for (const cs of columnSummaries) {
    if (!tables.has(cs.table_name)) tables.set(cs.table_name, [])
    tables.get(cs.table_name)!.push(cs)
  }

  if (columnSummaries.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">
          No column usage data found yet.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Accordion type="multiple" defaultValue={Array.from(tables.keys())} className="w-full">
        {Array.from(tables.entries()).map(([tableName, cols]) => (
          <AccordionItem key={tableName} value={tableName} className="border rounded-lg mb-3 px-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm font-semibold text-foreground">
                  {tableName}
                </span>
                <Badge variant="outline" className="text-[10px] ml-2">
                  {cols.length} columns
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {cols.reduce((acc, c) => acc + c.total_usages, 0)} usages
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50">
                    <TableHead className="text-[11px] font-medium w-[200px]">Column</TableHead>
                    <TableHead className="text-[11px] font-medium w-[100px]">Type</TableHead>
                    <TableHead className="text-[11px] font-medium w-[80px]">Keys</TableHead>
                    <TableHead className="text-[11px] font-medium">Used In Files</TableHead>
                    <TableHead className="text-[11px] font-medium w-[80px] text-right">Usages</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cols.map((col) => (
                    <TableRow key={col.column_id} className="border-b border-border/30">
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs font-medium text-foreground">
                            {col.column_name}
                          </span>
                          {col.ai_description && (
                            <span className="flex items-start gap-1 text-[10px] text-muted-foreground leading-relaxed">
                              <Sparkles className="h-2.5 w-2.5 mt-0.5 shrink-0 text-primary" />
                              {col.ai_description.slice(0, 80)}
                              {col.ai_description.length > 80 ? "..." : ""}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {col.data_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {col.is_primary_key && (
                            <Key className="h-3 w-3 text-[hsl(var(--chart-3))]" title="Primary Key" />
                          )}
                          {col.is_foreign_key && (
                            <Link2 className="h-3 w-3 text-primary" title={`FK -> ${col.foreign_table}.${col.foreign_column}`} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          {col.files.length === 0 ? (
                            <span className="text-[10px] text-muted-foreground italic">
                              No usages found
                            </span>
                          ) : (
                            col.files.map((f) => {
                              const config = getLanguageConfig(f.language)
                              return (
                                <div
                                  key={f.file_id}
                                  className="flex items-center gap-2 rounded px-2 py-1"
                                  style={{
                                    backgroundColor: config.bgColor,
                                    border: `1px solid ${config.borderColor}`,
                                  }}
                                >
                                  <FileCode
                                    className="h-3 w-3 shrink-0"
                                    style={{ color: config.color }}
                                  />
                                  <span
                                    className="text-[10px] font-mono truncate max-w-[200px]"
                                    style={{ color: config.color }}
                                    title={f.file_path}
                                  >
                                    {f.file_path.split("/").pop()}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 shrink-0"
                                    style={{
                                      color: config.color,
                                      borderColor: config.borderColor,
                                    }}
                                  >
                                    {config.label}
                                  </Badge>
                                  <div className="flex gap-0.5 shrink-0">
                                    {f.usage_types.map((ut) => (
                                      <span
                                        key={ut}
                                        className="text-[8px] px-1 py-0.5 rounded font-medium"
                                        style={{
                                          color: usageColors[ut] || "hsl(var(--muted-foreground))",
                                          backgroundColor: `${usageColors[ut] || "hsl(var(--muted-foreground))"}15`,
                                        }}
                                      >
                                        {ut}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground ml-auto shrink-0">
                                    <Hash className="h-2 w-2" />
                                    {f.line_numbers.length > 3
                                      ? `${f.line_numbers.slice(0, 3).join(", ")}...`
                                      : f.line_numbers.join(", ")}
                                  </span>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold text-foreground">
                          {col.total_usages}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
