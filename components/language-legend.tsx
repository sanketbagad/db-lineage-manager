"use client"

import { LANGUAGE_CONFIG } from "@/lib/languages"

interface LanguageLegendProps {
  files: Array<{ language: string }>
}

export function LanguageLegend({ files }: LanguageLegendProps) {
  const activeLanguages = [...new Set(files.map((f) => f.language))].filter(
    (l) => l !== "unknown" && LANGUAGE_CONFIG[l]
  )

  if (activeLanguages.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Languages
      </span>
      {activeLanguages.map((lang) => {
        const config = LANGUAGE_CONFIG[lang]
        return (
          <div key={lang} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-xs text-foreground">{config.label}</span>
          </div>
        )
      })}
    </div>
  )
}
