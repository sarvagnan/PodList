import { useAtomSet } from "@effect/atom-react"
import { useCallback } from "react"
import { episodeActionAtom } from "../../app/episodeActions.ts"
import type { EpisodeAction } from "../../lib/episodeActions.ts"
import { useConfirm } from "../feedback/useConfirm.ts"

/** Runs an Episode action, then confirms it with an Undo. */
export function useEpisodeActions() {
  const run = useAtomSet(episodeActionAtom, { mode: "promise" })
  const confirm = useConfirm()
  return useCallback(
    async (action: EpisodeAction) => {
      const outcome = await run(action)
      // Undo brings the Episode's row back (or keeps it): focus goes to its title.
      confirm(
        outcome,
        () => run(action),
        () =>
          document.querySelector<HTMLElement>(
            `[data-sheet="drawer"] [data-episode-title="${action.episodeId}"]`
          ) ?? document.querySelector<HTMLElement>(`[data-episode-title="${action.episodeId}"]`)
      )
    },
    [run, confirm]
  )
}
