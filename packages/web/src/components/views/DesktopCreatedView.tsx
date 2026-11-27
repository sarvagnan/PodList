import { useAtom } from "@effect/atom-react"
import { useNavigate } from "@tanstack/react-router"
import { Atom } from "effect/reactivity"
import { useCallback, useEffect } from "react"
import { useAppState } from "../../app/hooks.ts"

export const createdSearchViewAtom = Atom.make<string | null>(null).pipe(Atom.keepAlive)

export function DesktopCreatedView() {
  const [id, setId] = useAtom(createdSearchViewAtom)
  const saved = useAppState()?.views.some((view) => view.id === id) === true
  const navigate = useNavigate()
  const open = useCallback(() => {
    if (!id || !saved) return
    void navigate({ to: "/views/$viewId", params: { viewId: id } }).then(() => setId(null))
  }, [id, navigate, saved, setId])

  useEffect(() => {
    window.podlistApp?.setCreatedView?.(saved)
    const command = (event: Event) => {
      if (event instanceof CustomEvent && event.detail === "openCreatedView") open()
    }
    document.addEventListener("podlist:command", command)
    return () => document.removeEventListener("podlist:command", command)
  }, [open, saved])

  if (!saved) return null
  return (
    <div className="flex justify-end px-5 py-1 md:px-8">
      <button
        type="button"
        onClick={open}
        className="rounded-md px-2 py-1 text-row font-medium text-primary hover:bg-secondary"
      >
        Open Created View
      </button>
    </div>
  )
}
