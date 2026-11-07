import { useEffect, useRef } from "react"

/**
 * Commits a typed value a moment after typing stops, at once on `now` (blur), and on
 * unmount if one is still waiting: leaving a screen right after typing must not lose
 * the edit (DATA-01).
 */
export function useDebounced(commit: (value: string) => void, waitMillis = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<{ readonly value: string } | null>(null)
  const latest = useRef(commit)
  latest.current = commit
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      if (pending.current !== null) latest.current(pending.current.value)
    },
    []
  )
  const flush = (value: string) => {
    clearTimeout(timer.current)
    pending.current = null
    latest.current(value)
  }
  return {
    schedule: (value: string) => {
      clearTimeout(timer.current)
      pending.current = { value }
      timer.current = setTimeout(() => flush(value), waitMillis)
    },
    now: flush
  }
}
