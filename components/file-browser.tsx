"use client"

import { getLanguageConfig } from "@/lib/languages"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileCode } from "lucide-react"

interface SourceFile {
  id: string
  file_path: string
  language: string
  parsed: boolean
}

interface FileBrowserProps {
  files: SourceFile[]
}

export function FileBrowser({ files }: FileBrowserProps) {
  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No source files uploaded yet.
        </p>
      </div>
    )
  }

  const languageCounts = files.reduce(
    (acc, f) => {
      acc[f.language] = (acc[f.language] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(languageCounts).map(([lang, count]) => {
          const config = getLanguageConfig(lang)
          return (
            <Badge
              key={lang}
              variant="outline"
              className="text-xs"
              style={{
                backgroundColor: config.bgColor,
                borderColor: config.borderColor,
                color: config.color,
              }}
            >
              {config.label}: {count}
            </Badge>
          )
        })}
      </div>

      <ScrollArea className="h-[400px] rounded-md border">
        <div className="p-2">
          {files.map((file) => {
            const config = getLanguageConfig(file.language)
            return (
              <div
                key={file.id}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs hover:bg-accent/50"
              >
                <FileCode
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: config.color }}
                />
                <span className="flex-1 truncate font-mono text-foreground">
                  {file.file_path}
                </span>
                <Badge
                  variant="outline"
                  className="shrink-0 text-[10px]"
                  style={{
                    backgroundColor: config.bgColor,
                    borderColor: config.borderColor,
                    color: config.color,
                  }}
                >
                  {config.label}
                </Badge>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
