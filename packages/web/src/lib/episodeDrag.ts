import type { DragEvent } from "react"

export const episodeDragType = "application/x-podlist-episodes"

interface EpisodeDrag {
  readonly ids: ReadonlyArray<string>
  readonly sourcePlaylist?: string
}

// A transfer belongs to this Library renderer. Untrusted external drags cannot submit IDs.
let current: EpisodeDrag | null = null

export function episodeDragSource(ids: () => ReadonlyArray<string>, sourcePlaylist?: string) {
  return {
    draggable: true,
    onDragStart(event: DragEvent<HTMLElement>) {
      const episodes = ids()
      if (!episodes.length) {
        event.preventDefault()
        return
      }
      current = { ids: episodes, ...(sourcePlaylist === undefined ? {} : { sourcePlaylist }) }
      event.dataTransfer.clearData()
      event.dataTransfer.setData(episodeDragType, "episodes")
      event.dataTransfer.effectAllowed = "copy"
    },
    onDragEnd() {
      current = null
    }
  }
}

export function episodeDragFor(data: DataTransfer, playlistId: string) {
  return data.types.includes(episodeDragType) && current?.sourcePlaylist !== playlistId
    ? current
    : null
}
