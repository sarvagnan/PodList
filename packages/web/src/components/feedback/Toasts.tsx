import { Toast } from "@base-ui/react/toast"
import { useAtomValue } from "@effect/atom-react"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { drawerAtom } from "../../app/drawer.ts"

/**
 * Confirmations with Undo, just above the player: where the eye already is after acting
 * on a row, and clear of the bottom tabs (FLOW-04). Announced politely. With the Now
 * Playing drawer open they show inside it, in a strip it keeps free at its foot: within
 * its focus trap (WKEY-03), over none of its controls (WKEY-04), and lighter than its
 * dark sheet so they don't read as one of its buttons (APPEAR-10).
 */
export function Toasts() {
  const { toasts } = Toast.useToastManager()
  const drawerOpen = useAtomValue(drawerAtom).open
  const [drawer, setDrawer] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!drawerOpen) return setDrawer(null)
    // The drawer's sheet mounts a moment after it opens.
    let frame = 0
    const find = () => {
      const sheet = document.querySelector<HTMLElement>('[data-sheet="drawer"]')
      if (sheet) setDrawer(sheet)
      else frame = requestAnimationFrame(find)
    }
    find()
    return () => cancelAnimationFrame(frame)
  }, [drawerOpen])
  const inDrawer = drawer !== null
  // While a toast shows, focused rows scroll clear of it too, not just of the player.
  const showing = toasts.some((toast) => !toast.limited)
  useEffect(() => {
    document.documentElement.style.setProperty("--toast-space", showing ? "5rem" : "0px")
  }, [showing])
  return (
    // Only a real container: null would put the toasts nowhere, not on the page.
    <Toast.Portal {...(drawer ? { container: drawer } : {})}>
      <Toast.Viewport
        className={
          inDrawer
            ? "absolute inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-10 mx-auto max-w-md"
            : "fixed inset-x-3 bottom-[calc(var(--bottom-stack,10.5rem)+0.5rem)] z-[60] mx-auto max-w-md md:right-auto md:bottom-28 md:left-[256px] md:mx-0 md:w-[min(26rem,calc(100vw-288px))]"
        }
      >
        {toasts
          .filter((toast) => !toast.limited)
          .map((toast) => (
            <Toast.Root
              key={toast.id}
              toast={toast}
              className={`surface-dark flex items-center gap-2 rounded-xl py-1.5 pr-1.5 pl-4 text-row text-player-foreground shadow-lg transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 ${inDrawer ? "border border-white/25 bg-player-track" : "bg-player"}`}
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
