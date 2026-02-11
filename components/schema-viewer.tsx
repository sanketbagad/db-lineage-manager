"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Key, Link2, Sparkles } from "lucide-react"

interface Column {
  id: string
  column_name: string
  data_type: string
  is_primary_key: boolean
  is_foreign_key: boolean
  foreign_table: string | null
  foreign_column: string | null
  ai_description: string | null
}

interface Schema {
  id: string
  table_name: string
  columns: Column[] | null
}

interface SchemaViewerProps {
  schemas: Schema[]
  onColumnClick?: (column: Column, tableName: string) => void
}

export function SchemaViewer({ schemas, onColumnClick }: SchemaViewerProps) {
  if (schemas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No schema detected. Include .sql files with CREATE TABLE statements.
        </p>
      </div>
    )
  }

  return (
    <Accordion type="multiple" defaultValue={schemas.map((s) => s.id)}>
      {schemas.map((schema) => (
        <AccordionItem key={schema.id} value={schema.id}>
          <AccordionTrigger className="text-sm font-mono hover:no-underline">
            <span className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {schema.table_name}
              </span>
              <Badge variant="outline" className="text-[10px] font-normal">
                {schema.columns?.length || 0} columns
              </Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Column</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schema.columns?.map((col) => (
                    <TableRow
                      key={col.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => onColumnClick?.(col, schema.table_name)}
                    >
                      <TableCell className="font-mono text-xs">
                        <span className="flex items-center gap-1.5">
                          {col.is_primary_key && (
                            <Key className="h-3 w-3 text-[hsl(var(--chart-3))]" />
                          )}
                          {col.is_foreign_key && (
                            <Link2 className="h-3 w-3 text-primary" />
                          )}
                          {col.column_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {col.data_type}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {col.is_foreign_key &&
                          col.foreign_table &&
                          `FK -> ${col.foreign_table}.${col.foreign_column}`}
                        {col.ai_description && (
                          <span className="flex items-center gap-1 text-primary">
                            <Sparkles className="h-3 w-3" />
                            {col.ai_description}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {"->"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
