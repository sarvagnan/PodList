import { useAtomSet } from "@effect/atom-react"
import { useCallback } from "react"
import { episodeActionAtom } from "../../app/episodeActions.ts"
import type { EpisodeAction } from "../../lib/episodeActions.ts"
import { useConfirm } from "../feedback/useConfirm.ts"

/** Runs an Episode action, then confirms it with an Undo. Play Now confirms itself. */
export function useEpisodeActions() {
  const run = useAtomSet(episodeActionAtom, { mode: "promise" })
  const confirm = useConfirm()
  return useCallback(
    async (action: EpisodeAction) => {
      const outcome = await run(action)
      if (action._tag !== "PlayNow") confirm(outcome, () => run(action))
    },
    [run, confirm]
  )
}
