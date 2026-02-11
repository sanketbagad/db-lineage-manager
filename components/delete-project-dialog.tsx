"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Loader2 } from "lucide-react"

// ============================================================================
// Compound Design Pattern for DeleteProjectDialog
// Components: Root, Trigger, Content, Warning, ConfirmInput, Actions
// ============================================================================

type DeleteProjectContextValue = {
  projectName: string
  confirmValue: string
  setConfirmValue: (value: string) => void
  isConfirmed: boolean
  isDeleting: boolean
  onDelete: () => Promise<void>
  open: boolean
  setOpen: (open: boolean) => void
}

const DeleteProjectContext = React.createContext<DeleteProjectContextValue | null>(null)

function useDeleteProject() {
  const context = React.useContext(DeleteProjectContext)
  if (!context) {
    throw new Error("DeleteProject components must be used within DeleteProject.Root")
  }
  return context
}

// ============================================================================
// Root Component - Provides context for all child components
// ============================================================================
interface RootProps {
  children: React.ReactNode
  projectName: string
  onDelete: () => Promise<void>
}

function Root({ children, projectName, onDelete }: RootProps) {
  const [confirmValue, setConfirmValue] = React.useState("")
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  const isConfirmed = confirmValue === projectName

  const handleDelete = async () => {
    if (!isConfirmed) return
    setIsDeleting(true)
    try {
      await onDelete()
      setOpen(false)
    } finally {
      setIsDeleting(false)
      setConfirmValue("")
    }
  }

  // Reset confirm value when dialog closes
  React.useEffect(() => {
    if (!open) {
      setConfirmValue("")
    }
  }, [open])

  return (
    <DeleteProjectContext.Provider
      value={{
        projectName,
        confirmValue,
        setConfirmValue,
        isConfirmed,
        isDeleting,
        onDelete: handleDelete,
        open,
        setOpen,
      }}
    >
      <AlertDialog open={open} onOpenChange={setOpen}>
        {children}
      </AlertDialog>
    </DeleteProjectContext.Provider>
  )
}

// ============================================================================
// Trigger Component - Opens the dialog
// ============================================================================
interface TriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

function Trigger({ children, asChild }: TriggerProps) {
  return <AlertDialogTrigger asChild={asChild}>{children}</AlertDialogTrigger>
}

// ============================================================================
// Content Component - Dialog content wrapper
// ============================================================================
interface ContentProps {
  children: React.ReactNode
}

function Content({ children }: ContentProps) {
  return <AlertDialogContent className="max-w-md">{children}</AlertDialogContent>
}

// ============================================================================
// Header Component - Title and description
// ============================================================================
interface HeaderProps {
  title?: string
  description?: string
}

function Header({
  title = "Delete Project",
  description = "This action cannot be undone. This will permanently delete the project and all associated data.",
}: HeaderProps) {
  const { projectName } = useDeleteProject()

  return (
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        {title}
      </AlertDialogTitle>
      <AlertDialogDescription className="space-y-2">
        <span>{description}</span>
        <span className="block font-medium text-foreground">
          Project: <code className="bg-muted px-1.5 py-0.5 rounded">{projectName}</code>
        </span>
      </AlertDialogDescription>
    </AlertDialogHeader>
  )
}

// ============================================================================
// Warning Component - Displays warning message
// ============================================================================
interface WarningProps {
  children?: React.ReactNode
}

function Warning({ children }: WarningProps) {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
      {children || (
        <>
          <strong>Warning:</strong> This will delete all source files, database schemas,
          columns, lineage data, and processing jobs associated with this project.
        </>
      )}
    </div>
  )
}

// ============================================================================
// ConfirmInput Component - Input for typing project name
// ============================================================================
interface ConfirmInputProps {
  label?: string
  placeholder?: string
}

function ConfirmInput({
  label = "Type the project name to confirm:",
  placeholder,
}: ConfirmInputProps) {
  const { projectName, confirmValue, setConfirmValue, isDeleting } = useDeleteProject()

  return (
    <div className="space-y-2">
      <Label htmlFor="confirm-delete" className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id="confirm-delete"
        value={confirmValue}
        onChange={(e) => setConfirmValue(e.target.value)}
        placeholder={placeholder || projectName}
        disabled={isDeleting}
        className="font-mono"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  )
}

// ============================================================================
// Actions Component - Cancel and Delete buttons
// ============================================================================
interface ActionsProps {
  cancelText?: string
  deleteText?: string
  deletingText?: string
}

function Actions({
  cancelText = "Cancel",
  deleteText = "Delete Project",
  deletingText = "Deleting...",
}: ActionsProps) {
  const { isConfirmed, isDeleting, onDelete } = useDeleteProject()

  return (
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>{cancelText}</AlertDialogCancel>
      <AlertDialogAction
        onClick={(e) => {
          e.preventDefault()
          onDelete()
        }}
        disabled={!isConfirmed || isDeleting}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
      >
        {isDeleting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {deletingText}
          </>
        ) : (
          deleteText
        )}
      </AlertDialogAction>
    </AlertDialogFooter>
  )
}

// ============================================================================
// Default Composed Component for simple usage
// ============================================================================
interface DeleteProjectDialogProps {
  children: React.ReactNode // Trigger element
  projectName: string
  onDelete: () => Promise<void>
}

function DeleteProjectDialog({ children, projectName, onDelete }: DeleteProjectDialogProps) {
  return (
    <Root projectName={projectName} onDelete={onDelete}>
      <Trigger asChild>{children}</Trigger>
      <Content>
        <Header />
        <div className="space-y-4 py-4">
          <Warning />
          <ConfirmInput />
        </div>
        <Actions />
      </Content>
    </Root>
  )
}

// ============================================================================
// Export compound components
// ============================================================================
export const DeleteProject = {
  Root,
  Trigger,
  Content,
  Header,
  Warning,
  ConfirmInput,
  Actions,
}

export { DeleteProjectDialog }
