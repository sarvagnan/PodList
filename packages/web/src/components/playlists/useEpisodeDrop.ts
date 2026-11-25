import { Toast } from "@base-ui/react/toast"
import { useAtomSet } from "@effect/atom-react"
import { type DragEvent, useState } from "react"
import { addDroppedEpisodesAtom } from "../../app/episodeActions.ts"
import { episodeDragFor } from "../../lib/episodeDrag.ts"
import { useConfirm } from "../feedback/useConfirm.ts"

export function useEpisodeDrop(enabled: boolean) {
  const [target, setTarget] = useState<string | null>(null)
  const add = useAtomSet(addDroppedEpisodesAtom, { mode: "promise" })
  const confirm = useConfirm()
  const toast = Toast.useToastManager()
  return (playlistId: string) =>
    enabled
      ? {
          "data-episode-drop": target === playlistId ? "over" : "ready",
          onDragOver(event: DragEvent<HTMLElement>) {
            const drag = episodeDragFor(event.dataTransfer, playlistId)
            if (!drag) return
            event.preventDefault()
            event.dataTransfer.dropEffect = "copy"
            setTarget(playlistId)
          },
          onDragLeave(event: DragEvent<HTMLElement>) {
            if (
              event.relatedTarget instanceof Node &&
              event.currentTarget.contains(event.relatedTarget)
            )
              return
            setTarget((previous) => (previous === playlistId ? null : previous))
          },
          async onDrop(event: DragEvent<HTMLElement>) {
            setTarget(null)
            const drag = episodeDragFor(event.dataTransfer, playlistId)
            if (!drag) return
            event.preventDefault()
            event.stopPropagation()
            const again = () => add({ playlistId, episodeIds: drag.ids })
            try {
              confirm(await again(), again)
            } catch {
              toast.add({
                description: "Could not add the dropped Episodes. Try again.",
                timeout: 5000
              })
            }
          }
        }
      : {}
}
