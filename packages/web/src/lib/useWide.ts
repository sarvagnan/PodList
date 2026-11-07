import { type RefObject, useEffect, useState, useSyncExternalStore } from "react"

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

/**
 * An element's width in rem at the page's current text size, kept up to date. Media
 * queries measure rem at the browser's default size, so they can't tell when enlarged
 * text no longer fits a layout; this can.
 */
export function useWidthInRem(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(Number.POSITIVE_INFINITY)
  useEffect(() => {
    const element = ref.current
    if (element === null) return
    const measure = () => {
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      setWidth(element.clientWidth / rem)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    observer.observe(document.documentElement)
    return () => observer.disconnect()
  }, [ref])
  return width
}
