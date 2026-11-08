import { AlertDialog } from "@base-ui/react/alert-dialog"
import { X } from "lucide-react"
import { type ReactNode, useState } from "react"
import { useBackLayers } from "../../lib/backLayers.ts"
import { wrapTab } from "../../lib/focusTrap.ts"

/** Asks before a step that has no Undo (Unsubscribe). */
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
  /** May answer, after a wait, with what went wrong: the dialog then stays open and says
   * so beside its button, where Try again is (WDATA-04). */
  readonly onConfirm: () => Promise<string | null | undefined> | undefined
}) {
  useBackLayers(open ? 1 : 0, () => onOpenChange(false))
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const close = (next: boolean) => {
    if (!next) setProblem(null)
    onOpenChange(next)
  }
  return (
    <AlertDialog.Root open={open} onOpenChange={close}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <AlertDialog.Popup
          data-sheet="dialog"
          onKeyDown={wrapTab}
          className="fixed top-1/2 left-1/2 z-50 w-[min(26rem,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card p-5 shadow-xl transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
        >
          {/* The same head as every other dialog: its title, and × to cancel. */}
          <div className="flex items-start justify-between gap-4">
            <AlertDialog.Title className="font-heading text-xl font-semibold">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Close
              aria-label="Cancel"
              className="-mt-1 -mr-2 grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary active:bg-input"
            >
              <X aria-hidden="true" className="size-5" />
            </AlertDialog.Close>
          </div>
          <AlertDialog.Description className="mt-2 text-row text-muted-foreground">
            {children}
          </AlertDialog.Description>
          {problem && (
            <p role="alert" className="mt-3 text-row font-medium text-destructive">
              {problem}
            </p>
          )}
          {/* The same full-width pair as every other dialog's footer. */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <AlertDialog.Close className="h-11 rounded-full bg-secondary px-5 font-semibold text-secondary-foreground hover:bg-input">
              Cancel
            </AlertDialog.Close>
            <button
              type="button"
              aria-disabled={busy}
              onClick={async () => {
                if (busy) return
                setProblem(null)
                const answer = onConfirm()
                if (!(answer instanceof Promise)) return close(false)
                setBusy(true)
                const failed = await answer
                setBusy(false)
                if (typeof failed === "string") setProblem(failed)
                else close(false)
              }}
              className={`h-11 rounded-full px-5 font-semibold text-primary-foreground aria-disabled:opacity-60 ${destructive ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"}`}
            >
              {busy ? "Working…" : problem ? "Try again" : confirm}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
