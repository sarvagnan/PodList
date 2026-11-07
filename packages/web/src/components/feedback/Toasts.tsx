import { Toast } from "@base-ui/react/toast"
import { X } from "lucide-react"

/**
 * Above everything, the Now Playing drawer included, so an Undo is never hidden (FLOW-04).
 * Confirmations with Undo, just above the player: where the eye already is after
 * acting on a row, and clear of the bottom tabs (FLOW-04). Announced politely.
 */
export function Toasts() {
  const { toasts } = Toast.useToastManager()
  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed inset-x-3 bottom-[calc(var(--bottom-stack,10.5rem)+0.5rem)] z-[60] mx-auto max-w-md md:right-auto md:bottom-28 md:left-[256px] md:mx-0 md:w-[min(26rem,calc(100vw-288px))]">
        {toasts
          .filter((toast) => !toast.limited)
          .map((toast) => (
            <Toast.Root
              key={toast.id}
              toast={toast}
              className="surface-dark flex items-center gap-2 rounded-xl bg-player py-1.5 pr-1.5 pl-4 text-row text-player-foreground shadow-lg transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
            >
              <Toast.Description className="line-clamp-3 min-w-0 flex-1" />
              <Toast.Action className="h-10 rounded-lg px-3 font-semibold text-[#9db4ff] hover:bg-white/10" />
              <Toast.Close
                aria-label="Dismiss"
                className="grid size-10 place-items-center rounded-lg text-player-muted hover:bg-white/10"
              >
                <X aria-hidden="true" className="size-4" />
              </Toast.Close>
            </Toast.Root>
          ))}
      </Toast.Viewport>
    </Toast.Portal>
  )
}
