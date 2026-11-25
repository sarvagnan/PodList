import type { ViewEpisode } from "../../app/data.ts"
import { formatLength } from "../../lib/time.ts"
import { DesktopInspector } from "../shell/DesktopPanes.tsx"
import { BulkBar } from "./BulkBar.tsx"
import { EpisodeDetail } from "./EpisodeDetail.tsx"

export function DesktopEpisodeInspector({
  selected,
  episodes,
  checked,
  clearSelection
}: {
  readonly selected?: string | undefined
  readonly episodes?: ReadonlyArray<ViewEpisode>
  readonly checked?: ReadonlySet<string>
  readonly clearSelection: () => void
}) {
  const selection = episodes?.filter((episode) => checked?.has(episode.id)) ?? []
  const single =
    selection.length === 1 ? selection[0] : episodes?.find((episode) => episode.id === selected)
  const episodeId = single?.id ?? selected
  return (
    <DesktopInspector
      selectionKey={
        selection.length > 1
          ? JSON.stringify(selection.map((episode) => episode.id))
          : (episodeId ?? null)
      }
      clearSelection={clearSelection}
    >
      {selection.length > 1 ? (
        <section aria-label="Episode selection inspector" className="space-y-3 px-4 pt-3">
          <h2 className="font-heading text-xl font-semibold">
            {selection.length} Episodes selected
          </h2>
          <p>
            Total length ·{" "}
            {formatLength(selection.reduce((sum, episode) => sum + (episode.duration ?? 0), 0))}
          </p>
          <BulkBar
            inInspector
            selected={selection.map((episode) => episode.id)}
            onClear={clearSelection}
          />
        </section>
      ) : episodeId ? (
        <EpisodeDetail episodeId={episodeId} summary={single} />
      ) : null}
    </DesktopInspector>
  )
}
