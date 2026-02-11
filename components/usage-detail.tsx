"use client"

import { getLanguageConfig } from "@/lib/languages"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { FileCode, Table, Hash, Sparkles } from "lucide-react"

interface UsageDetailProps {
  usage: {
    usage_id: string
    usage_type: string
    line_number: number
    code_snippet: string
    context: string
    column_name: string
    data_type: string
    is_primary_key: boolean
    is_foreign_key: boolean
    foreign_table: string | null
    foreign_column: string | null
    ai_description: string | null
    table_name: string
    file_path: string
    language: string
  } | null
  open: boolean
  onClose: () => void
}

const usageLabels: Record<string, { label: string; color: string }> = {
  read: { label: "Read", color: "hsl(var(--chart-2))" },
  write: { label: "Write", color: "hsl(var(--chart-1))" },
  update: { label: "Update", color: "hsl(var(--chart-3))" },
  delete: { label: "Delete", color: "hsl(var(--destructive))" },
  join: { label: "Join", color: "hsl(var(--chart-4))" },
  filter: { label: "Filter", color: "hsl(var(--chart-5))" },
  projection: { label: "Projection", color: "hsl(var(--primary))" },
}

export function UsageDetail({ usage, open, onClose }: UsageDetailProps) {
  if (!usage) return null

  const langConfig = getLanguageConfig(usage.language)
  const usageInfo = usageLabels[usage.usage_type] || {
    label: usage.usage_type,
    color: "hsl(var(--muted-foreground))",
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-mono text-sm">
            {usage.table_name}.{usage.column_name}
          </SheetTitle>
          <SheetDescription>Column usage detail</SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-5">
          {/* Column info */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Column
            </h4>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Table className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {usage.table_name}
                </span>
                <span className="text-muted-foreground">.</span>
                <span className="font-mono text-sm text-foreground">
                  {usage.column_name}
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {usage.data_type}
                </Badge>
                {usage.is_primary_key && (
                  <Badge variant="outline" className="text-[10px] border-[hsl(var(--chart-3))]/40 text-[hsl(var(--chart-3))]">
                    Primary Key
                  </Badge>
                )}
                {usage.is_foreign_key && (
                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                    FK &gt; {usage.foreign_table}.{usage.foreign_column}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* AI description */}
          {usage.ai_description && (
            <div className="flex flex-col gap-2">
              <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                AI Description
              </h4>
              <p className="text-sm leading-relaxed text-foreground">
                {usage.ai_description}
              </p>
            </div>
          )}

          <Separator />

          {/* Usage info */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Usage
            </h4>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="text-xs"
                style={{ color: usageInfo.color, borderColor: usageInfo.color }}
              >
                {usageInfo.label}
              </Badge>
            </div>
          </div>

          {/* File info */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Source File
            </h4>
            <div
              className="rounded-md border p-3"
              style={{
                backgroundColor: langConfig.bgColor,
                borderColor: langConfig.borderColor,
              }}
            >
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4" style={{ color: langConfig.color }} />
                <span className="text-xs font-mono truncate" style={{ color: langConfig.color }}>
                  {usage.file_path}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[10px]"
                  style={{ color: langConfig.color, borderColor: langConfig.borderColor }}
                >
                  {langConfig.label}
                </Badge>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Hash className="h-2.5 w-2.5" /> Line {usage.line_number}
                </span>
              </div>
            </div>
          </div>

          {/* Code snippet */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Code Snippet
            </h4>
            <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 text-[11px] leading-relaxed font-mono text-foreground">
              {usage.code_snippet}
            </pre>
          </div>

          {/* Context */}
          {usage.context && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Surrounding Context
              </h4>
              <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 text-[10px] leading-relaxed font-mono text-muted-foreground">
                {usage.context}
              </pre>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
