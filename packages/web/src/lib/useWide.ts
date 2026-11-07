import { useSyncExternalStore } from "react"

/** Whether the window is at least this wide (a CSS length), kept up to date. */
export function useMinWidth(width: string) {
  const query = `(min-width: ${width})`
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches
  )
}
