import { Toast } from "@base-ui/react/toast"
import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { AsyncResult } from "effect/reactivity"
import { ArrowDownToLine, Check, ListEnd, ListStart, Star, X } from "lucide-react"
import type { ReactNode } from "react"
import { bulkActionAtom, nextLastTargetAtom, undoAtom } from "../../app/episodeActions.ts"
import { useAppState } from "../../app/hooks.ts"
import { downloadAtom, downloadsAtom } from "../../app/runtime.ts"
import type { EpisodeAction } from "../../lib/episodeActions.ts"

const episodes = (n: number) => `${n} ${n === 1 ? "Episode" : "Episodes"}`

function BulkButton({
  onClick,
  icon,
  children
}: {
  readonly onClick: () => void
  readonly icon: ReactNode
  readonly children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-secondary active:bg-input"
    >
      {icon}
      {children}
    </button>
  )
}

/**
 * Desktop: with rows ticked, the View's toolbar becomes this bar (docs/design/ui-layout.md).
 * Each action is one step with one Undo; the selection stays, so another can follow.
 */
export function BulkBar({
  selected,
  onClear
}: {
  readonly selected: ReadonlyArray<string>
  readonly onClear: () => void
}) {
  const state = useAppState()
  const chosen = useAtomValue(nextLastTargetAtom)
  const run = useAtomSet(bulkActionAtom, { mode: "promise" })
  const undo = useAtomSet(undoAtom)
  const download = useAtomSet(downloadAtom)
  const downloads = AsyncResult.getOrElse(useAtomValue(downloadsAtom), () => new Map())
  const toasts = Toast.useToastManager()
  const target =
    state?.playlists.find((p) => p.id === chosen) ??
    state?.playlists.find((p) => p.id === state.activePlaylistId)
  const n = selected.length
  const allStarred = selected.every((id) => state?.episodeStates[id]?.starred)
  const allPlayed = selected.every((id) => state?.episodeStates[id]?.played != null)

  const act = async (actions: ReadonlyArray<EpisodeAction>, message: string) => {
    const outcome = await run({ actions, message })
    toasts.add({
      description: outcome.message,
      timeout: 6000,
      ...(outcome.undo.length > 0
        ? { actionProps: { children: "Undo", onClick: () => undo(outcome.undo) } }
        : {})
    })
  }
  const add = (placement: "next" | "last") => {
    if (!target) return
    // Play Next puts each one straight after the current Entry, so add them last
    // first to keep the View's order.
    const ordered = placement === "next" ? [...selected].reverse() : selected
    void act(
      ordered.map((episodeId) => ({ _tag: "Add", episodeId, playlistId: target.id, placement })),
      `${episodes(n)} ${placement === "next" ? "playing next" : "added last"} in ${target.name}`
    )
  }

  return (
    <div
      role="toolbar"
      aria-label={`${episodes(n)} selected`}
      className="flex flex-wrap items-center gap-1 rounded-full border bg-card py-1 pr-1 pl-4 shadow-sm"
    >
      <span className="mr-2 text-sm font-semibold">{n} selected</span>
      <BulkButton
        onClick={() => add("next")}
        icon={<ListStart aria-hidden="true" className="size-4" />}
      >
        Play Next
      </BulkButton>
      <BulkButton
        onClick={() => add("last")}
        icon={<ListEnd aria-hidden="true" className="size-4" />}
      >
        Play Last
      </BulkButton>
      <BulkButton
        onClick={() =>
          void act(
            selected.map((episodeId) => ({ _tag: "Played", episodeId, played: !allPlayed })),
            `${episodes(n)} marked ${allPlayed ? "Unplayed" : "Played"}`
          )
        }
        icon={<Check aria-hidden="true" className="size-4" />}
      >
        {allPlayed ? "Mark Unplayed" : "Mark Played"}
      </BulkButton>
      <BulkButton
        onClick={() =>
          void act(
            selected.map((episodeId) => ({ _tag: "Star", episodeId, starred: !allStarred })),
            `${episodes(n)} ${allStarred ? "unstarred" : "starred"}`
          )
        }
        icon={<Star aria-hidden="true" className="size-4" />}
      >
        {allStarred ? "Unstar" : "Star"}
      </BulkButton>
      <BulkButton
        onClick={() => {
          const missing = selected.filter((id) => downloads.get(id)?._tag !== "Stored")
          for (const episodeId of missing) download({ _tag: "download", episodeId })
          toasts.add({ description: `Downloading ${episodes(missing.length)}`, timeout: 4000 })
        }}
        icon={<ArrowDownToLine aria-hidden="true" className="size-4" />}
      >
        Download
      </BulkButton>
      <button
        type="button"
        aria-label="Clear selection"
        title="Clear selection"
        onClick={onClear}
        className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-secondary active:bg-input"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
