import { useLayoutEffect, useState } from "react"
import { desktopBuild } from "./DesktopPanes.tsx"

// The current selection is in the address. Returning to another list within
// this window can also restore the selection it had when we left it.
const selections = new Map<string, string>()

export function useDesktopListSelection(
  list: string,
  requested: string | undefined,
  isMissing: (episode: string) => boolean
) {
  const [, refresh] = useState(0)
  const remembered = desktopBuild ? (requested ?? selections.get(list)) : requested
  const invalid = desktopBuild && remembered !== undefined && isMissing(remembered)
  const selected = invalid ? undefined : remembered
  useLayoutEffect(() => {
    if (!desktopBuild) return
    if (selected === undefined) selections.delete(list)
    else selections.set(list, selected)
  }, [list, selected])
  const forget = () => {
    if (selections.delete(list) && requested === undefined) refresh((version) => version + 1)
  }
  return { selected, invalid: invalid && requested !== undefined, forget }
}
