import { Dialog } from "@base-ui/react/dialog"
import type { ReactNode } from "react"
import { useMinWidth } from "../../lib/useWide.ts"

/** The list scrolls the page; this column stays at the content's top and scrolls itself.
 * A selected Episode remains reachable if the window narrows or its URL opens on a phone. */
export function DetailColumn({
  label,
  children,
  openOnNarrow = false,
  onClose
}: {
  readonly label: string
  readonly children: ReactNode
  readonly openOnNarrow?: boolean
  readonly onClose: () => void
}) {
  const wide = useMinWidth("64rem")
  if (wide)
    return (
      <aside
        aria-label={label}
        className="sticky top-0 h-[calc(100dvh-max(112px,var(--desktop-player,0px)))] self-start overflow-y-auto overscroll-contain border-l pt-2 pr-4 pb-6"
      >
        {children}
      </aside>
    )
  if (!openOnNarrow) return null
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/30" />
        <Dialog.Popup
          data-sheet=""
          finalFocus={false}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-2xl bg-background pt-2 pb-[max(24px,env(safe-area-inset-bottom))] outline-none"
        >
          <Dialog.Title className="sr-only">{label}</Dialog.Title>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
