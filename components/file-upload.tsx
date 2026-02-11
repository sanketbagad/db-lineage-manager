"use client"

import React from "react"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, FileArchive, Check, AlertCircle, RotateCcw } from "lucide-react"
import { toast } from "sonner"

interface FileUploadProps {
  projectId: string
  onUploadComplete: () => void
  maxRetries?: number
}

// Exponential backoff delay
function getRetryDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 10000) // Max 10 seconds
}

export function FileUpload({ projectId, onUploadComplete, maxRetries = 3 }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle")
  const [fileName, setFileName] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const lastFileRef = useRef<File | null>(null)

  const uploadWithRetry = useCallback(
    async (file: File, attempt: number = 0): Promise<boolean> => {
      try {
        const formData = new FormData()
        formData.append("file", file)

        setProgress(40 + attempt * 10)
        setStatus("processing")

        const res = await fetch(`/api/projects/${projectId}/upload`, {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Upload failed")
        }

        const data = await res.json()
        setProgress(100)
        setStatus("done")
        setRetryCount(0)
        toast.success(`Processed ${data.filesProcessed} files`)
        onUploadComplete()
        return true
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Upload failed"
        
        // Check if we should retry
        if (attempt < maxRetries) {
          const delay = getRetryDelay(attempt)
          setRetryCount(attempt + 1)
          toast.warning(`Upload failed, retrying in ${delay / 1000}s... (${attempt + 1}/${maxRetries})`)
          
          await new Promise((resolve) => setTimeout(resolve, delay))
          return uploadWithRetry(file, attempt + 1)
        }
        
        // Max retries exceeded
        setStatus("error")
        setErrorMessage(errorMsg)
        setRetryCount(0)
        toast.error(`Upload failed after ${maxRetries} attempts: ${errorMsg}`)
        return false
      }
    },
    [projectId, onUploadComplete, maxRetries]
  )

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".zip")) {
        toast.error("Please upload a .zip file")
        return
      }

      setUploading(true)
      setFileName(file.name)
      setErrorMessage(null)
      setStatus("uploading")
      setProgress(20)
      lastFileRef.current = file

      await uploadWithRetry(file, 0)
      setUploading(false)
    },
    [uploadWithRetry]
  )

  const handleRetry = useCallback(() => {
    if (lastFileRef.current) {
      handleUpload(lastFileRef.current)
    } else {
      setStatus("idle")
      setProgress(0)
      setErrorMessage(null)
    }
  }, [handleUpload])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  return (
    <div
      className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        status === "done"
          ? "border-[hsl(var(--chart-2))]/40 bg-[hsl(var(--chart-2))]/5"
          : status === "error"
            ? "border-destructive/40 bg-destructive/5"
            : "border-border hover:border-primary/40"
      }`}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {status === "idle" && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Drop your source code ZIP here
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Include SQL schema files for best results
            </p>
          </div>
          <label htmlFor="file-upload">
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              asChild
            >
              <span>
                <FileArchive className="mr-2 h-4 w-4" />
                Choose ZIP file
              </span>
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".zip"
              className="sr-only"
              onChange={handleFileInput}
              disabled={uploading}
            />
          </label>
        </div>
      )}

      {(status === "uploading" || status === "processing") && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <FileArchive className="h-5 w-5 animate-pulse text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {status === "uploading" ? "Uploading" : "Processing"}{" "}
              {fileName}...
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {status === "uploading"
                ? "Sending file to server"
                : retryCount > 0
                  ? `Retry attempt ${retryCount}/${maxRetries}...`
                  : "Scanning files and tracing column lineage"}
            </p>
          </div>
          <Progress value={progress} className="h-1.5 w-64" />
          {retryCount > 0 && (
            <p className="text-xs text-amber-600">
              Retrying upload...
            </p>
          )}
        </div>
      )}

      {status === "done" && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--chart-2))]/15">
            <Check className="h-5 w-5 text-[hsl(var(--chart-2))]" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Upload complete
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Upload failed</p>
            {errorMessage && (
              <p className="mt-1 text-xs text-destructive max-w-xs">
                {errorMessage}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry Upload
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatus("idle")
                setProgress(0)
                setErrorMessage(null)
                lastFileRef.current = null
              }}
            >
              Choose Different File
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
