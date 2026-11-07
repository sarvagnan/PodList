import { useRouter } from "@tanstack/react-router"
import { useEffect, useLayoutEffect, useRef } from "react"

// Back, Forward and reload return a list to where it was scrolled (BROWSER-01, DATA-06).
// Lists fill in from the local database after the screen renders, so the position is
// restored once the list says it is ready, which the router's own restoration can't wait
// for. Positions are kept per history entry, for this tab only.

const storageKey = (entry: string) => `podlist:scroll:${entry}`

export function useScrollMemory(ready: boolean) {
  const { history } = useRouter()
  const entry = history.location.state.__TSR_key ?? "initial"

  useEffect(() => {
    const save = () => {
      // Leaving this screen resets the scroll; that isn't this entry's position.
      if ((history.location.state.__TSR_key ?? "initial") !== entry) return
      try {
        sessionStorage.setItem(storageKey(entry), String(Math.round(window.scrollY)))
      } catch {
        // Not remembered.
      }
    }
    window.addEventListener("scroll", save, { passive: true })
    return () => window.removeEventListener("scroll", save)
  }, [entry, history])

  const restored = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (!ready || restored.current === entry) return
    restored.current = entry
    let saved = 0
    try {
      saved = Number(sessionStorage.getItem(storageKey(entry)) ?? 0)
    } catch {
      return
    }
    if (saved > 0) window.scrollTo(0, saved)
  }, [ready, entry])
}
