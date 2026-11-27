import { Toast } from "@base-ui/react/toast"
import { useAtomSet } from "@effect/atom-react"
import { useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { useCanEdit, useLibraryReady } from "../../app/hooks.ts"
import { opmlCommandAtom } from "../../app/library.ts"
import { opmlImport } from "../../library/OpmlImport.ts"

export function DesktopOpenOpml() {
  const ready = useLibraryReady()
  const canEdit = useCanEdit()
  const command = useAtomSet(opmlCommandAtom)
  const navigate = useNavigate()
  const toast = Toast.useToastManager()

  useEffect(() => {
    const bridge = window.podlistApp?.opml
    if (!ready || !bridge) return
    let active = true
    let running = false
    let requested = false
    const drain = async () => {
      requested = true
      if (running) return
      running = true
      try {
        while (active && requested) {
          requested = false
          const opened = await bridge.take()
          if (!active || !opened.length) continue
          const files = opened.flatMap((file) => {
            if ("contents" in file) return [new File([file.contents], file.name)]
            toast.add({ description: `${file.name}: ${file.error}`, timeout: 5000 })
            return []
          })
          if (!files.length) continue
          if (!canEdit || opmlImport.getSnapshot().phase === "running") {
            toast.add({
              description: canEdit
                ? "Finish the current OPML import, then open the file again."
                : "This Library is read-only.",
              timeout: 5000
            })
            continue
          }
          await navigate({ to: "/settings", search: { opml: true } })
          if (active) command(files)
        }
      } catch {
        if (active) toast.add({ description: "Could not open the OPML file.", timeout: 5000 })
      } finally {
        running = false
      }
    }
    const unsubscribe = bridge.onAvailable(() => void drain())
    const initial = setTimeout(() => void drain(), 0)
    return () => {
      active = false
      clearTimeout(initial)
      unsubscribe()
    }
  }, [ready, canEdit, command, navigate, toast])
  return null
}
