"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  RefreshCw,
  Download,
  ImageDown,
  FileJson,
  FileText,
  ChevronDown,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { toPng, toSvg } from "html-to-image"

interface LineageControlsProps {
  projectId: string
  tableName?: string
  columnName?: string
  onRegenerate?: () => void
  flowContainerRef?: React.RefObject<HTMLDivElement | null>
  lineageData?: unknown
  isRegenerating?: boolean
}

export function LineageControls({
  projectId,
  tableName,
  columnName,
  onRegenerate,
  flowContainerRef,
  lineageData,
  isRegenerating = false,
}: LineageControlsProps) {
  const [downloading, setDownloading] = useState(false)

  const handleRegenerate = useCallback(async () => {
    try {
      // Invalidate cache first
      await fetch(`/api/dbLineage/invalidate/${projectId}`, {
        method: "POST",
      })

      // Trigger parent's regenerate callback
      onRegenerate?.()
      toast.success("Lineage regenerated")
    } catch (error) {
      toast.error("Failed to regenerate lineage")
    }
  }, [projectId, onRegenerate])

  const handleDownloadPng = useCallback(async () => {
    if (!flowContainerRef?.current) {
      toast.error("No lineage diagram to download")
      return
    }

    setDownloading(true)
    try {
      const dataUrl = await toPng(flowContainerRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      })

      const link = document.createElement("a")
      link.download = `lineage-${tableName || "diagram"}-${Date.now()}.png`
      link.href = dataUrl
      link.click()
      toast.success("PNG downloaded")
    } catch (error) {
      toast.error("Failed to download PNG")
    } finally {
      setDownloading(false)
    }
  }, [flowContainerRef, tableName])

  const handleDownloadSvg = useCallback(async () => {
    if (!flowContainerRef?.current) {
      toast.error("No lineage diagram to download")
      return
    }

    setDownloading(true)
    try {
      const dataUrl = await toSvg(flowContainerRef.current)

      const link = document.createElement("a")
      link.download = `lineage-${tableName || "diagram"}-${Date.now()}.svg`
      link.href = dataUrl
      link.click()
      toast.success("SVG downloaded")
    } catch (error) {
      toast.error("Failed to download SVG")
    } finally {
      setDownloading(false)
    }
  }, [flowContainerRef, tableName])

  const handleDownloadJson = useCallback(() => {
    if (!lineageData) {
      toast.error("No lineage data to download")
      return
    }

    const blob = new Blob([JSON.stringify(lineageData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.download = `lineage-${tableName || "data"}-${Date.now()}.json`
    link.href = url
    link.click()

    URL.revokeObjectURL(url)
    toast.success("JSON downloaded")
  }, [lineageData, tableName])

  const handleDownloadText = useCallback(() => {
    if (!lineageData) {
      toast.error("No lineage data to download")
      return
    }

    // Convert lineage to text format
    const text = convertLineageToText(lineageData)
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.download = `lineage-${tableName || "report"}-${Date.now()}.txt`
    link.href = url
    link.click()

    URL.revokeObjectURL(url)
    toast.success("Text report downloaded")
  }, [lineageData, tableName])

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRegenerate}
        disabled={isRegenerating}
        className="gap-2"
      >
        {isRegenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Regenerate
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={downloading}
            className="gap-2"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDownloadPng}>
            <ImageDown className="mr-2 h-4 w-4" />
            Download as PNG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadSvg}>
            <ImageDown className="mr-2 h-4 w-4" />
            Download as SVG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadJson}>
            <FileJson className="mr-2 h-4 w-4" />
            Download as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadText}>
            <FileText className="mr-2 h-4 w-4" />
            Download as Text
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// Helper function to convert lineage data to text format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertLineageToText(data: any, depth: number = 0): string {
  const indent = "  ".repeat(depth)
  let text = ""

  if (data.name) {
    text += `${indent}${data.type || "NODE"}: ${data.name}\n`
  }

  if (data.typeInformations?.length > 0) {
    text += `${indent}  Columns:\n`
    for (const col of data.typeInformations) {
      text += `${indent}    - ${col.name}\n`
    }
  }

  if (data.children?.length > 0) {
    for (const child of data.children) {
      text += convertLineageToText(child, depth + 1)
    }
  }

  return text
}
