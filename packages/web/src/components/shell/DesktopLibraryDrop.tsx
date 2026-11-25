import { Toast } from "@base-ui/react/toast"
import { useAtomSet } from "@effect/atom-react"
import { useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { useCanEdit } from "../../app/hooks.ts"
import { opmlCommandAtom } from "../../app/library.ts"
import { droppedFeedAddress } from "../../lib/podListLink.ts"
import { opmlImport } from "../../library/OpmlImport.ts"

export function DesktopLibraryDrop() {
  const navigate = useNavigate()
  const canEdit = useCanEdit()
  const preview = useAtomSet(opmlCommandAtom)
  const toast = Toast.useToastManager()
  useEffect(() => {
    const handle = (event: DragEvent) => {
      const data = event.dataTransfer
      if (!data || event.defaultPrevented) return
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('[data-file-drop], input[type="file"]')) return
      const files = data.types.includes("Files")
      const editable = target?.closest('input, textarea, [contenteditable="true"]')
      const canStageFeed =
        (!editable || editable.hasAttribute("data-add-field")) &&
        (data.types.includes("text/uri-list") || data.types.includes("text/plain"))
      if (!files && !canStageFeed) return
      event.preventDefault()
      if (event.type === "dragover") {
        data.dropEffect = "copy"
        return
      }
      if (files) {
        const opml = Array.from(data.files).filter((file) => /\.opml$/i.test(file.name))
        if (!opml.length) return
        if (!canEdit || opmlImport.getSnapshot().phase === "running") {
          toast.add({
            description: canEdit
              ? "Finish the current OPML import, then drop the file again."
              : "This Library is read-only.",
            timeout: 5000
          })
          return
        }
        void navigate({ to: "/settings", search: { opml: true } }).then(() => preview(opml))
        return
      }
      const address = droppedFeedAddress(data)
      if (address) {
        void navigate({
          to: "/library",
          search: (current) => ({
            ...(current.sort ? { sort: current.sort } : {}),
            add: true,
            feed: address
          })
        })
      }
    }
    window.addEventListener("dragover", handle)
    window.addEventListener("drop", handle)
    return () => {
      window.removeEventListener("dragover", handle)
      window.removeEventListener("drop", handle)
    }
  }, [canEdit, navigate, preview, toast])
  return null
}
