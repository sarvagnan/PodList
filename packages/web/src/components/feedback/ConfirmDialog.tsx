import { AlertDialog } from "@base-ui/react/alert-dialog"
import type { ReactNode } from "react"
import { useBackLayers } from "../../lib/backLayers.ts"
import { wrapTab } from "../../lib/focusTrap.ts"

/** Asks before a step that has no Undo (Unsubscribe, Mark all Played). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirm,
  destructive = false,
  onConfirm
}: {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly title: string
  readonly children: ReactNode
  /** The confirming button's words: the action itself, never "OK". */
  readonly confirm: string
  readonly destructive?: boolean
  readonly onConfirm: () => void
}) {
  useBackLayers(open ? 1 : 0, () => onOpenChange(false))
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <AlertDialog.Popup
          data-sheet="dialog"
          onKeyDown={wrapTab}
          className="fixed top-1/2 left-1/2 z-50 w-[min(26rem,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-5 shadow-xl transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
        >
          <AlertDialog.Title className="font-heading text-xl font-semibold">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-row text-muted-foreground">
            {children}
          </AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-3">
            <AlertDialog.Close className="h-11 rounded-full bg-secondary px-5 font-semibold text-secondary-foreground hover:bg-input">
              Cancel
            </AlertDialog.Close>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false)
                onConfirm()
              }}
              className={`h-11 rounded-full px-5 font-semibold text-primary-foreground ${destructive ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"}`}
            >
              {confirm}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
