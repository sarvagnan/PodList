import { useEffect, useRef } from "react"
import { localClient } from "#client"

/**
 * Commits a typed value a moment after typing stops, at once on `now` (blur), and on
 * unmount or when the page is hidden or closed if one is still waiting: leaving right
 * after typing must not lose the edit (DATA-01).
 */
export function useDebounced(commit: (value: string) => void, waitMillis = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<{ readonly value: string } | null>(null)
  const latest = useRef(commit)
  latest.current = commit
  useEffect(() => {
    // Leaving the page (closing, reloading, switching away): the waiting edit is
    // committed now, not lost with the timer (DATA-01).
    const leave = () => {
      clearTimeout(timer.current)
      const waiting = pending.current
      pending.current = null
      if (waiting !== null) latest.current(waiting.value)
    }
    const onHidden = () => {
      if (document.visibilityState === "hidden") leave()
    }
    window.addEventListener("pagehide", leave)
    document.addEventListener("visibilitychange", onHidden)
    return () => {
      window.removeEventListener("pagehide", leave)
      document.removeEventListener("visibilitychange", onHidden)
      leave()
    }
  }, [])
  const flush = (value: string) => {
    clearTimeout(timer.current)
    pending.current = null
    latest.current(value)
  }
  return {
    schedule: (value: string) => {
      if (!localClient) {
        flush(value)
        return
      }
      clearTimeout(timer.current)
      pending.current = { value }
      timer.current = setTimeout(() => flush(value), waitMillis)
    },
    now: flush
  }
}
