import { useRouter } from "@tanstack/react-router"
import { useEffect, useLayoutEffect, useRef } from "react"

// Back, Forward and reload return a list to where it was scrolled (BROWSER-01, DATA-06).
// Lists fill in from the local database after the screen renders, so the position is
// restored once the list says it is ready, which the router's own restoration can't wait
// for. Positions are kept per history entry, for this tab only.

const storageKey = (entry: string) => `podlist:scroll:${entry}`

export function useScrollMemory(ready: boolean) {
  const router = useRouter()
  const { history } = router
  const entry = history.location.state.__TSR_key ?? "initial"

  // Until this entry's position is back, scrolls are the router's and the list's own
  // (to the top, as the page fills in), not the reader's: they mustn't overwrite it.
  const settled = useRef(false)
  // Before the restore below (layout effects run in order), for each entry.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new entry is what resets it.
  useLayoutEffect(() => {
    settled.current = false
  }, [entry])
  useEffect(() => {
    const save = () => {
      if (!settled.current) return
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

  // Restore once the list is ready, and again if the router renders this entry later:
  // it scrolls to the top when it does, which would undo a restore made before then.
  const restored = useRef<string | null>(null)
  const readyNow = useRef(ready)
  readyNow.current = ready
  useLayoutEffect(() => {
    if (!ready || restored.current === entry) return
    restored.current = entry
    return restore(entry, () => {
      settled.current = true
    })
  }, [ready, entry])
  useEffect(
    () =>
      router.subscribe("onRendered", (event) => {
        const key = event.toLocation.state.__TSR_key ?? "initial"
        if (key === entry && readyNow.current) restore(entry, () => {})
      }),
    [router, entry]
  )
}

/** Scrolls back to the entry's saved position, trying for half a second while the list
 * grows to its full height, and stopping if the reader scrolls first; `settled` is told
 * when it's done (or there was nothing to restore). */
const restore = (entry: string, settled: () => void) => {
  let saved = 0
  try {
    saved = Number(sessionStorage.getItem(storageKey(entry)) ?? 0)
  } catch {
    settled()
    return
  }
  if (!(saved > 0)) {
    settled()
    return
  }
  let frames = 30
  let frame = 0
  const stop = () => {
    settled()
    cancelAnimationFrame(frame)
    window.removeEventListener("wheel", stop)
    window.removeEventListener("touchstart", stop)
    window.removeEventListener("keydown", stop)
  }
  const attempt = () => {
    window.scrollTo(0, saved)
    if (Math.abs(window.scrollY - saved) < 2 || --frames === 0) stop()
    else frame = requestAnimationFrame(attempt)
  }
  window.addEventListener("wheel", stop, { passive: true })
  window.addEventListener("touchstart", stop, { passive: true })
  window.addEventListener("keydown", stop)
  attempt()
  return stop
}
